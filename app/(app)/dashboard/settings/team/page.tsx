"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";

interface TeamMemberRow {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: { name: string; email: string; avatar: string | null };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function TeamSettingsPage() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchJson<TeamMemberRow[]>("/api/v1/team"),
  });

  const updateRole = useMutation({
    mutationFn: (input: { memberId: string; role: "ADMIN" | "MEMBER" }) =>
      fetchJson("/api/v1/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => fetchJson(`/api/v1/team?memberId=${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">فريق العمل</h1>
          <p className="text-sm text-muted-foreground">إدارة أدوار الأعضاء الحاليين في النشاط</p>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />)
        ) : (
          members?.map((member) => (
            <Card key={member.id} className="flex flex-row items-center gap-4 rounded-2xl p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {member.user.name.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{member.user.name}</div>
                <div className="text-sm text-muted-foreground">{member.user.email}</div>
              </div>

              {member.role === "OWNER" ? (
                <Badge>مالك</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(role) => updateRole.mutate({ memberId: member.id, role: role as "ADMIN" | "MEMBER" })}
                  >
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">أدمن</SelectItem>
                      <SelectItem value="MEMBER">عضو</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(member.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        دعوة أعضاء جدد بإيميل هتتضاف قريبًا — دلوقتي الأعضاء بينضموا لما يسجّلوا عن طريق نفس حساب النشاط.
      </p>
    </div>
  );
}
