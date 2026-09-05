"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

/**
 * Fetches the first club managed by the current user.
 * Returns { clubId, loading, error }.
 * Used by admin pages to auto-inject the club field into create/edit requests.
 */
export function useClub() {
  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const { data } = await api.get("/clubs", { params: { limit: 1 } });
        const clubs = data.data || [];
        if (clubs.length > 0) {
          setClubId(clubs[0]._id);
        } else {
          setError("No clubs found. Create a club first.");
        }
      } catch (e: any) {
        setError(e.response?.data?.message || "Failed to fetch club");
      } finally {
        setLoading(false);
      }
    };
    fetchClub();
  }, []);

  return { clubId, loading, error };
}
