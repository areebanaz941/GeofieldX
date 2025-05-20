import { pgTable, text, serial, integer, boolean, jsonb, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for feature states and statuses
export const featureStateEnum = pgEnum('feature_state', ['Plan', 'Under Construction', 'As-Built', 'Abandoned']);
export const featureStatusEnum = pgEnum('feature_status', ['New', 'InProgress', 'Completed', 'In-Completed', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress', 'Active']);
export const maintenanceEnum = pgEnum('maintenance_status', ['Required', 'None']);
export const featureTypeEnum = pgEnum('feature_type', ['Tower', 'Manhole', 'FiberCable', 'Parcel']);
export const specificFeatureTypeEnum = pgEnum('specific_feature_type', ['Mobillink', 'Ptcl', '2-way', '4-way', '10F', '24F', 'Commercial', 'Residential']);
export const userRoleEnum = pgEnum('user_role', ['Supervisor', 'Field']);
export const taskStatusEnum = pgEnum('task_status', ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'In-Complete', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress']);
export const taskPriorityEnum = pgEnum('task_priority', ['Low', 'Medium', 'High', 'Urgent']);
export const teamStatusEnum = pgEnum('team_status', ['Pending', 'Approved', 'Rejected']);

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default('Field'),
  teamId: integer("team_id"), // Will be updated with a reference later
  lastActive: timestamp("last_active"),
  currentLocation: jsonb("current_location"), // GeoJSON Point
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Boundaries Table (for assigning areas to field teams)
export const boundaries = pgTable("boundaries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  geometry: jsonb("geometry").notNull(), // GeoJSON Polygon
  status: featureStatusEnum("status").notNull().default('Unassigned'),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Features Table (base table for all feature types)
export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  feaNo: varchar("fea_no", { length: 100 }).notNull(),
  feaState: featureStateEnum("fea_state").notNull().default('Plan'),
  feaStatus: featureStatusEnum("fea_status").notNull().default('New'),
  feaType: featureTypeEnum("fea_type").notNull(),
  specificType: specificFeatureTypeEnum("specific_type").notNull(),
  maintenance: maintenanceEnum("maintenance").notNull().default('None'),
  maintenanceDate: timestamp("maintenance_date"),
  geometry: jsonb("geometry").notNull(), // GeoJSON (Point, LineString, or Polygon)
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  remarks: text("remarks"),
  createdBy: integer("created_by").references(() => users.id),
  boundaryId: integer("boundary_id").references(() => boundaries.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks Table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default('Unassigned'),
  priority: taskPriorityEnum("priority").notNull().default('Medium'),
  dueDate: timestamp("due_date"),
  location: jsonb("location"), // GeoJSON Point
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  featureId: integer("feature_id").references(() => features.id),
  boundaryId: integer("boundary_id").references(() => boundaries.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task Updates Table
export const taskUpdates = pgTable("task_updates", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  comment: text("comment"),
  oldStatus: taskStatusEnum("old_status"),
  newStatus: taskStatusEnum("new_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Task Evidence Table (for image uploads)
export const taskEvidence = pgTable("task_evidence", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teams Table (for field team management)
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  status: teamStatusEnum("status").notNull().default('Pending'),
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({ id: true, lastActive: true, currentLocation: true, createdAt: true });
export const insertBoundarySchema = createInsertSchema(boundaries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeatureSchema = createInsertSchema(features).omit({ id: true, lastUpdated: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskUpdateSchema = createInsertSchema(taskUpdates).omit({ id: true, createdAt: true });
export const insertTaskEvidenceSchema = createInsertSchema(taskEvidence).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, updatedAt: true, approvedBy: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Boundary = typeof boundaries.$inferSelect;
export type InsertBoundary = z.infer<typeof insertBoundarySchema>;

export type Feature = typeof features.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskUpdate = typeof taskUpdates.$inferSelect;
export type InsertTaskUpdate = z.infer<typeof insertTaskUpdateSchema>;

export type TaskEvidence = typeof taskEvidence.$inferSelect;
export type InsertTaskEvidence = z.infer<typeof insertTaskEvidenceSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

// Types for frontend use
export type UserWithLocation = User & {
  location?: {
    lat: number;
    lng: number;
  };
};

export type FeatureWithGeometry = Feature & {
  geometryData: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
};

export type TaskWithAssignee = Task & {
  assignee?: User;
};

export type UserWithTeam = User & {
  team?: Team;
};
