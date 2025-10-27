import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Define status colors and backgrounds
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "New":
        return {
          bg: "bg-[#FF0000]/10",
          text: "text-[#FF0000]",
        };
      case "Unassigned":
        return {
          bg: "bg-neutral-100",
          text: "text-neutral-700",
        };
      case "Assigned":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      case "In Progress":
      case "InProgress":
        return {
          bg: "bg-orange-100",
          text: "text-orange-700",
        };
      case "Completed":
        return {
          bg: "bg-[#2E8B57]/10",
          text: "text-[#2E8B57]",
        };
      case "In-Complete":
      case "In-Completed":
      case "Incomplete":
        return {
          bg: "bg-[#00008B]/10",
          text: "text-[#00008B]",
        };
      case "Submit-Review":
        return {
          bg: "bg-black/10",
          text: "text-black",
        };
      case "Review_Accepted":
        return {
          bg: "bg-[#00FFFF]/10",
          text: "text-[#00FFFF]",
        };
      case "Review_Reject":
        return {
          bg: "bg-[#FF00FF]/10",
          text: "text-[#FF00FF]",
        };
      case "Review_inprogress":
        return {
          bg: "bg-[#800080]/10",
          text: "text-[#800080]",
        };
      case "Active":
        return {
          bg: "bg-[#006400]/10",
          text: "text-[#006400]",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
        };
    }
  };

  const { bg, text } = getStatusStyles(status);

  // Format the status for display
  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        bg,
        text,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
