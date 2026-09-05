"use client";

import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2, Search, Mail, Phone, Calendar, MapPin,
  CheckCircle, XCircle, Clock, Trash2, Eye, MessageSquare, ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useClub } from "@/lib/use-club";

interface MatchRequest {
  _id: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  teamName: string;
  preferredDate?: string;
  preferredVenue?: string;
  message?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes?: string;
  createdAt: string;
}

const statusConfig = {
  PENDING: { icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  APPROVED: { icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-300" },
  REJECTED: { icon: XCircle, color: "bg-red-100 text-red-800 border-red-300" },
};

export default function MatchRequestsPage() {
  const { clubId } = useClub();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<MatchRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (clubId) params.club = clubId;
      if (search) params.search = search;
      const { data: res } = await api.get("/match-requests", { params });
      setRequests(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (e) {
      console.error("Failed to fetch match requests:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, clubId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setSubmitting(true);
    try {
      await api.patch(`/match-requests/${id}`, { status, adminNotes });
      toast.success(`Request ${status.toLowerCase()}`);
      setDetailOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      await api.delete(`/match-requests/${id}`);
      toast.success("Deleted");
      setDetailOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (req: MatchRequest) => {
    setSelected(req);
    setAdminNotes(req.adminNotes || "");
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Match Requests</h1>
          <p className="text-muted-foreground">{total} total requests</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, or team..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => {
              const count = requests.filter((r) => r.status === s).length;
              const cfg = statusConfig[s];
              return (
                <Badge key={s} variant="outline" className={cfg.color}>
                  {s} {count}
                </Badge>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No match requests yet
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const cfg = statusConfig[req.status];
                const Icon = cfg.icon;
                return (
                  <div
                    key={req._id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-muted-foreground/30 transition-colors cursor-pointer"
                    onClick={() => openDetail(req)}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{req.teamName}</p>
                        <span className="text-xs text-muted-foreground">vs Us</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {req.requesterName} • {req.requesterEmail}
                        {req.preferredDate && <> • {new Date(req.preferredDate).toLocaleDateString()}</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={cfg.color}>{req.status}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Match Request
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <p className="text-sm font-medium">{selected.requesterName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Team</p>
                  <p className="text-sm font-medium">{selected.teamName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${selected.requesterEmail}`} className="text-sm text-green-600 hover:underline">
                    {selected.requesterEmail}
                  </a>
                </div>
                {selected.requesterPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${selected.requesterPhone}`} className="text-sm text-green-600 hover:underline">
                      {selected.requesterPhone}
                    </a>
                  </div>
                )}
              </div>

              {selected.preferredDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Preferred: {new Date(selected.preferredDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.preferredVenue && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Venue: {selected.preferredVenue}</span>
                </div>
              )}

              {selected.message && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm">{selected.message}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this request..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(selected._id)}
                  disabled={submitting}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleStatus(selected._id, "REJECTED")}
                    disabled={submitting}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatus(selected._id, "APPROVED")}
                    disabled={submitting}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
