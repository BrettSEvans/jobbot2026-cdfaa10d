import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Story } from "@/hooks/useStories";
import { Epic } from "@/hooks/useEpics";
import { eachDayOfInterval, parseISO, format, isBefore, startOfDay } from "date-fns";

interface Sprint { id: string; name: string; status: string; start_date: string | null; end_date: string | null; }

interface SprintChartsProps {
  sprint: Sprint | undefined; stories: Story[]; allStories: Story[];
  allEpics: Epic[]; sprints: Sprint[];
}

export function SprintCharts({ sprint, stories, allStories, allEpics, sprints }: SprintChartsProps) {
  const burndownData = useMemo(() => {
    if (!sprint?.start_date || !sprint?.end_date) return [];
    const start = parseISO(sprint.start_date);
    const end = parseISO(sprint.end_date);
    if (isBefore(end, start)) return [];
    const days = eachDayOfInterval({ start, end });
    const totalPoints = stories.reduce((sum, s) => sum + (s.story_points ?? 1), 0);
    const idealDecrement = totalPoints / Math.max(days.length - 1, 1);
    return days.map((day, i) => {
      const dayStart = startOfDay(day);
      const remaining = stories.reduce((sum, s) => {
        if (s.status === "done" && s.updated_at && isBefore(parseISO(s.updated_at), dayStart)) return sum;
        return sum + (s.story_points ?? 1);
      }, 0);
      return { day: format(day, "MMM d"), ideal: Math.max(totalPoints - idealDecrement * i, 0), actual: remaining };
    });
  }, [sprint, stories]);

  const velocityData = useMemo(() => {
    if (!allStories || !allEpics || !sprints) return [];
    const epicToSprint: Record<string, string> = {};
    allEpics.forEach((e) => { epicToSprint[e.id] = e.sprint_id; });
    return sprints.filter((s) => s.status !== "reference").map((s) => {
      const pts = allStories.filter((st) => epicToSprint[st.epic_id] === s.id && st.status === "done").reduce((sum, st) => sum + (st.story_points ?? 1), 0);
      return { sprint: s.name, points: pts };
    });
  }, [allStories, allEpics, sprints]);

  const chartColors = { ideal: "hsl(var(--muted-foreground))", actual: "hsl(var(--primary))", bar: "hsl(var(--primary))" };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Sprint Burndown</h3>
        {burndownData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ideal" stroke={chartColors.ideal} strokeDasharray="5 5" dot={false} name="Ideal" />
              <Line type="monotone" dataKey="actual" stroke={chartColors.actual} strokeWidth={2} dot={{ r: 2 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-muted-foreground">Set sprint start/end dates to see the burndown chart.</p>}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Team Velocity</h3>
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="sprint" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
              <Bar dataKey="points" fill={chartColors.bar} radius={[4, 4, 0, 0]} name="Completed Points" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-muted-foreground">Complete stories across sprints to see velocity.</p>}
      </div>
    </div>
  );
}
