import { cache } from "react";
import { auth } from "@/auth";

export const getAdminSession = cache(async () => auth());
