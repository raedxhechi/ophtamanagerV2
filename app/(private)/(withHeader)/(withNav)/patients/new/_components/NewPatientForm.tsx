"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { client } from "@/api/browser/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createPatient } from "../actions";

export function NewPatientForm() {
  const [state, formAction, isPending] = useActionState(createPatient, null);

  // Fetched on the client, after the page is already displayed.
  const {
    data: companies,
    isLoading: companiesLoading,
    isError: companiesError,
  } = useQuery({
    queryKey: ["insurance_companies"],
    queryFn: async () => {
      const { data, error } = await client
        .from("insurance_companies")
        .select("id, name, insurance_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <form action={formAction} className="space-y-8">
      {/* Personal details */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="first_name">
            First name <span className="text-destructive">*</span>
          </Label>
          <Input id="first_name" name="first_name" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="last_name">
            Last name <span className="text-destructive">*</span>
          </Label>
          <Input id="last_name" name="last_name" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="date_of_birth">
            Date of birth <span className="text-destructive">*</span>
          </Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="gender">Gender</Label>
          <Select name="gender">
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Insurance */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="insurance_company_id">Insurance company</Label>
            {companiesLoading ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Loading…
              </span>
            ) : null}
          </div>
          <Select name="insurance_company_id" disabled={companiesLoading}>
            <SelectTrigger id="insurance_company_id" className="w-full">
              <SelectValue
                placeholder={
                  companiesError
                    ? "Failed to load companies"
                    : companiesLoading
                      ? "Loading…"
                      : "Select insurance company"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="insurance_number">Insurance number</Label>
          <Input id="insurance_number" name="insurance_number" />
        </div>
      </section>

      {/* Address */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="street">Street</Label>
          <Input id="street" name="street" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="house_number">House number</Label>
          <Input id="house_number" name="house_number" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="zipcode">Zipcode</Label>
          <Input id="zipcode" name="zipcode" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" />
        </div>
      </section>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Create patient"
          )}
        </Button>
        <Button asChild variant="ghost" type="button">
          <Link href="/patients">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
