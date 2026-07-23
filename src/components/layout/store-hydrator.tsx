"use client";

import * as React from "react";
import { useAppStore } from "@/store/app-store";
import type { Profile, Branch } from "@/types";

export function StoreHydrator({
  profile,
  branches,
}: {
  profile: Profile;
  branches: Branch[];
}) {
  const setProfile = useAppStore((s) => s.setProfile);
  const setBranches = useAppStore((s) => s.setBranches);

  React.useEffect(() => {
    setProfile(profile);
    setBranches(branches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  return null;
}
