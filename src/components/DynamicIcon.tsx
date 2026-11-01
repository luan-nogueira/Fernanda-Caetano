import React from "react";
import {
  Calendar,
  CalendarCheck,
  Sparkles,
  MapPin,
  Building2,
  MessageCircle,
  Instagram,
  Award,
  HeartHandshake,
  Stethoscope,
  ShieldCheck,
  Clock,
  Home,
  ExternalLink,
  Phone,
  FileText,
  UserCheck,
  Star,
} from "lucide-react";

export const ICON_OPTIONS = [
  "CalendarCheck",
  "Sparkles",
  "MapPin",
  "Building2",
  "MessageCircle",
  "Instagram",
  "Award",
  "Stethoscope",
  "HeartHandshake",
  "Home",
  "ShieldCheck",
  "Clock",
  "Phone",
  "Star",
] as const;

export function DynamicIcon({
  name,
  className = "w-5 h-5",
}: {
  name?: string;
  className?: string;
}) {
  switch (name) {
    case "CalendarCheck":
      return <CalendarCheck className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "MapPin":
      return <MapPin className={className} />;
    case "Building2":
      return <Building2 className={className} />;
    case "MessageCircle":
      return <MessageCircle className={className} />;
    case "Instagram":
      return <Instagram className={className} />;
    case "Award":
      return <Award className={className} />;
    case "Stethoscope":
      return <Stethoscope className={className} />;
    case "HeartHandshake":
      return <HeartHandshake className={className} />;
    case "Home":
      return <Home className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "Clock":
      return <Clock className={className} />;
    case "Phone":
      return <Phone className={className} />;
    case "FileText":
      return <FileText className={className} />;
    case "UserCheck":
      return <UserCheck className={className} />;
    case "Star":
      return <Star className={className} />;
    case "ExternalLink":
      return <ExternalLink className={className} />;
    case "Calendar":
    default:
      return <Calendar className={className} />;
  }
}

