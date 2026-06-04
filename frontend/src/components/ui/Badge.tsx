import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "new";
  className?: string;
}

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    new: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-sm",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
