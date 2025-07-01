import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ITask, IUser } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { getFieldUsers } from "@/lib/api";

interface TaskPanelProps {
  tasks: ITask[];
  selectedTask: ITask | null;
  onTaskSelect: (task: ITask) => void;
  expanded: boolean;
  onExpandToggle: () => void;
}

export default function TaskPanel({
  tasks,
  selectedTask,
  onTaskSelect,
  expanded,
  onExpandToggle,
}: TaskPanelProps) {
  const { t } = useTranslation();
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users/field"],
    queryFn: getFieldUsers,
  });

  // Get user name by id
  const getUserName = (userId?: any) => {
    if (!userId) return t('taskPanel.unassigned');
    const user = users.find((u: any) => u._id === userId);
    return user ? user.name : t('common.unknown');
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Format relative time
  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const taskDate = new Date(date);
    const diffMs = now.getTime() - taskDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  // Format due date
  const formatDueDate = (date: string | Date) => {
    if (!date) return "";
    
    const dueDate = new Date(date);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return t('taskPanel.overdue');
    if (diffDays === 0) return t('taskPanel.dueToday');
    if (diffDays === 1) return t('taskPanel.dueTomorrow');
    if (diffDays < 7) return t('taskPanel.dueInDays', { days: diffDays });
    return t('taskPanel.dueDate', { date: dueDate.toLocaleDateString() });
  };

  // Sort tasks by updated date (newest first)
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div
      className={`bg-white border-t border-neutral-200 z-10 transform transition-all duration-300 ease-in-out overflow-hidden 
        ${expanded ? "h-1/3 lg:h-1/3" : "h-12"}
        fixed lg:relative bottom-0 lg:bottom-auto left-0 lg:left-auto w-full lg:w-auto`}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-2 lg:px-4 py-2">
        <div className="flex items-center">
          <h2 className="text-sm lg:text-base font-medium">{t('mapView.tasksAndAssignments')}</h2>
          <span className="ml-1 lg:ml-2 px-1.5 lg:px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center space-x-1 lg:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExpandToggle}
            className="text-neutral-500 hover:text-neutral-700 h-8 w-8 lg:h-10 lg:w-10"
          >
            <i className={`ri-arrow-${expanded ? "down" : "up"}-s-line text-base lg:text-lg`}></i>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-500 hover:text-neutral-700 h-8 w-8 lg:h-10 lg:w-10"
            onClick={() => window.location.reload()}
          >
            <i className="ri-refresh-line text-base lg:text-lg"></i>
          </Button>

        </div>
      </div>

      {expanded && (
        <div className="p-2 lg:p-4 h-full overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <Card
                  key={task.id}
                  className={`hover:shadow-md transition-shadow duration-200 cursor-pointer border ${
                    selectedTask?.id === task.id
                      ? "ring-2 ring-primary-500"
                      : "border-neutral-200"
                  }`}
                  onClick={() => onTaskSelect(task)}
                >
                  <div className="p-3 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={task.status} />
                      {task.dueDate && (
                        <div className="text-xs text-neutral-500">
                          {formatDueDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-neutral-400 hover:text-primary-500 hover:bg-primary-50 h-7 w-7"
                      >
                        <i className="ri-map-pin-line"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-neutral-400 hover:text-primary-500 hover:bg-primary-50 h-7 w-7"
                      >
                        <i className="ri-more-2-fill"></i>
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium mb-1">{task.title}</h3>
                    <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                      {task.description || "No description provided"}
                    </p>
                    {task.location && (
                      <div className="flex items-center text-xs text-neutral-500">
                        <i className="ri-map-pin-line mr-1"></i>
                        <span>
                          {task.location.type === "Point"
                            ? `${task.location.coordinates[1].toFixed(4)}, ${task.location.coordinates[0].toFixed(4)}`
                            : "Location set"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <span>{getInitials(getUserName(task.assignedTo))}</span>
                      </div>
                      <span className="text-xs">{getUserName(task.assignedTo)}</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatRelativeTime(task.updatedAt)}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-neutral-500">
                No tasks found. Click "New Task" to create one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
