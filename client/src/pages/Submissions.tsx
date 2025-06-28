import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { Upload, FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
}

interface TaskSubmission {
  _id: string;
  taskId: string;
  userId: string;
  teamId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
  submissionStatus: 'Pending' | 'Reviewed' | 'Approved' | 'Rejected';
  reviewComments?: string;
  createdAt: string;
}

export default function Submissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionDescription, setSubmissionDescription] = useState("");
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  // Fetch in-progress tasks for the user's team
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks'],
    select: (data: Task[]) => {
      // Filter tasks that are in progress or assigned AND belong to the user's team
      return data.filter(task => {
        const isActiveTask = task.status === 'InProgress' || task.status === 'Assigned';
        
        // For field users, only show tasks assigned to their team
        if (user?.role === 'Field') {
          const isTeamTask = task.assignedTo?.toString() === user.teamId?.toString();
          return isActiveTask && isTeamTask;
        }
        
        // For supervisors, show all active tasks
        return isActiveTask;
      });
    },
  });

  // Fetch submissions for tasks
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/submissions'],
    queryFn: async () => {
      const allSubmissions: TaskSubmission[] = [];
      
      // Fetch submissions for each task
      for (const task of tasks) {
        try {
          const response = await fetch(`/api/tasks/${task._id}/submissions`);
          if (response.ok) {
            const taskSubmissions = await response.json();
            allSubmissions.push(...taskSubmissions);
          }
        } catch (error) {
          console.error(`Failed to fetch submissions for task ${task._id}:`, error);
        }
      }
      
      return allSubmissions;
    },
    enabled: tasks.length > 0,
  });

  const submitTaskMutation = useMutation({
    mutationFn: async ({ taskId, file, description }: { taskId: string; file: File; description: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);

      const response = await fetch(`/api/tasks/${taskId}/submissions`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit task');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Submission Successful",
        description: "Your task submission has been uploaded for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
      setIsSubmissionModalOpen(false);
      setSelectedTask(null);
      setSubmissionFile(null);
      setSubmissionDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSubmissionFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !submissionFile) {
      toast({
        title: "Missing Information",
        description: "Please select a task and file before submitting.",
        variant: "destructive",
      });
      return;
    }

    submitTaskMutation.mutate({
      taskId: selectedTask._id,
      file: submissionFile,
      description: submissionDescription,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Reviewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4" />;
      case 'Reviewed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (tasksLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Task Submissions</h1>
        <p className="text-gray-600 mt-2">
          Submit your completed work for review. Upload documents, images, or reports for assigned tasks.
        </p>
      </div>

      {/* In Progress Tasks Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Available Tasks for Submission
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No in-progress tasks available for submission. Check with your supervisor for new assignments.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const hasSubmission = submissions.some(s => s.taskId === task._id);
                
                return (
                  <div key={task._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{task.title}</h3>
                        {task.description && (
                          <p className="text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Priority: {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasSubmission ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            Submitted
                          </Badge>
                        ) : (
                          <Dialog open={isSubmissionModalOpen && selectedTask?._id === task._id} onOpenChange={(open) => {
                            setIsSubmissionModalOpen(open);
                            if (!open) {
                              setSelectedTask(null);
                              setSubmissionFile(null);
                              setSubmissionDescription("");
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedTask(task)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Submit Work
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Submit Task: {task.title}</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                  <Label htmlFor="file">Upload File *</Label>
                                  <Input
                                    id="file"
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                    required
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Supported formats: PDF, DOC, DOCX, TXT, Images. Max size: 10MB
                                  </p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="description">Description (Optional)</Label>
                                  <Textarea
                                    id="description"
                                    value={submissionDescription}
                                    onChange={(e) => setSubmissionDescription(e.target.value)}
                                    placeholder="Add any notes or comments about your submission..."
                                    rows={3}
                                  />
                                </div>

                                {submissionFile && (
                                  <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm font-medium">{submissionFile.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {formatFileSize(submissionFile.size)}
                                    </p>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-4">
                                  <Button 
                                    type="submit" 
                                    disabled={!submissionFile || submitTaskMutation.isPending}
                                    className="flex-1"
                                  >
                                    {submitTaskMutation.isPending ? "Submitting..." : "Submit"}
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsSubmissionModalOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissionsLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ) : submissions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No submissions yet. Complete and submit your assigned tasks to see them here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const task = tasks.find(t => t._id === submission.taskId);
                
                return (
                  <div key={submission._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{task?.title || 'Unknown Task'}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(submission.submissionStatus)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(submission.submissionStatus)}
                              {submission.submissionStatus}
                            </div>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">{submission.fileName}</span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(submission.fileSize)})
                            </span>
                          </div>
                          {submission.description && (
                            <p className="text-sm text-gray-600 mt-1">{submission.description}</p>
                          )}
                        </div>

                        {submission.reviewComments && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900">Reviewer Comments:</h4>
                            <p className="text-sm text-blue-800 mt-1">{submission.reviewComments}</p>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(submission.fileUrl, '_blank')}
                      >
                        View File
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}