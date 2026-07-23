"use client";

import { type ReactNode, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "glass" | "solid" | "outline";
  glow?: "cyan" | "blue" | "purple" | "none";
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
}

const variantClasses = {
  glass: "glass-card",
  solid: "bg-dark-800 border border-dark-600",
  outline: "bg-transparent border border-dark-500",
};

const glowClasses = {
  cyan: "glow-cyan",
  blue: "glow-blue",
  purple: "glow-purple",
  none: "",
};

const paddingClasses = {
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  children,
  variant = "solid",
  glow = "none",
  padding = "md",
  hoverable = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl transition-all duration-300 ${variantClasses[variant]} ${glowClasses[glow]} ${paddingClasses[padding]} ${hoverable ? "hover:scale-[1.01] hover:brightness-110 cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
