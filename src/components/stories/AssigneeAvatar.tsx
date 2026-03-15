import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Profile } from "@/hooks/useProfiles";

interface AssigneeAvatarProps {
  profile: Profile | undefined;
  size?: "sm" | "md";
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function AssigneeAvatar({ profile, size = "sm" }: AssigneeAvatarProps) {
  if (!profile) return null;
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={`${dim} shrink-0`}>
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="bg-primary/20 text-primary text-[9px]">
            {getInitials(profile.display_name)}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {profile.display_name ?? "Unknown"}
      </TooltipContent>
    </Tooltip>
  );
}
