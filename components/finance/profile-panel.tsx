"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

import { FormField } from "@/components/crm/crm-ui";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { classifyDependent } from "@/lib/finance/tax";
import { FILING_STATUS_LABEL, TAX_TABLES } from "@/lib/finance/tax-tables";
import { TAX_YEARS, newId, type Business, type CategoryRule, type Dependent, type FilingStatus, type FinProfile, type TaxYear, type W2Job } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

import { CategorySelect, CustomFieldsRepeater, NumberInput, Repeater, Section, usd0 } from "./fin-ui";

const RELATIONSHIPS: { v: Dependent["relationship"]; l: string }[] = [
  { v: "son", l: "Son" }, { v: "daughter", l: "Daughter" }, { v: "stepchild", l: "Stepchild" }, { v: "foster_child", l: "Foster child" },
  { v: "fiancee", l: "Fiancée / fiancé" }, { v: "partner", l: "Partner" }, { v: "parent", l: "Parent" }, { v: "sibling", l: "Sibling" }, { v: "other", l: "Other" },
];

const ADJUSTMENTS: { key: keyof FinProfile["adjustments"]; label: string; hint?: string }[] = [
  { key: "retirementContrib", label: "SEP-IRA / Solo 401(k)", hint: "Employer contributions you made" },
  { key: "seHealthInsurance", label: "Self-employed health insurance", hint: "Premiums you paid (not through a W-2 plan)" },
  { key: "hsa", label: "HSA contributions", hint: "Outside of payroll" },
  { key: "traditionalIra", label: "Traditional IRA" },
  { key: "studentLoanInterest", label: "Student loan interest", hint: "Form 1098-E" },
  { key: "carLoanInterest", label: "Car loan interest", hint: "New US-assembled personal vehicle, 2025–2028" },
  { key: "childcareExpenses", label: "Childcare / daycare paid", hint: "Kids under 13, so you can work" },
  { key: "otherIncome", label: "Interest & other income", hint: "1099-INT, 1099-MISC" },
  { key: "capitalGains", label: "Net capital gain / (loss)", hint: "Negative for a loss" },
  { key: "arizonaCharitableCredit", label: "AZ QCO / QFCO donations (credit)", hint: "Credit amount you qualify for" },
  { key: "arizonaPrivateSchoolCredit", label: "AZ school tuition org credit", hint: "Credit amount you qualify for" },
  { key: "priorYearFederalTax", label: "Last year's total federal tax", hint: "For the safe-harbor estimate" },
];

export function ProfilePanel({ profile, onChange, saved }: { profile: FinProfile; onChange: (p: FinProfile) => void; saved: string }) {
  const set = <K extends keyof FinProfile>(k: K, v: FinProfile[K]) => onChange({ ...profile, [k]: v });
  const t = TAX_TABLES[profile.taxYear];
  const ho = profile.homeOffice;

  return (
    <div className="space-y-5">
      <p className={cn("text-right text-xs", saved === "error" ? "text-destructive" : "text-muted-foreground")}>
        {saved === "saving" ? "Saving…" : saved === "saved" ? "All changes saved" : saved === "error" ? "Couldn't save — check your connection" : "Changes save automatically"}
      </p>

      <Section title="Filing" description="State is Arizona (Form 140, flat 2.5%). Federal is Form 1040 with Schedule C.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Tax year">
            <Select value={String(profile.taxYear)} onValueChange={(v) => set("taxYear", Number(v) as TaxYear)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TAX_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Filing status">
            <Select value={profile.filingStatus} onValueChange={(v) => set("filingStatus", v as FilingStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(FILING_STATUS_LABEL) as FilingStatus[]).map((s) => <SelectItem key={s} value={s}>{FILING_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Your name"><Input value={profile.taxpayer.name} onChange={(e) => set("taxpayer", { ...profile.taxpayer, name: e.target.value })} /></FormField>
          <FormField label="Occupation (W-2 job)"><Input value={profile.taxpayer.occupation} onChange={(e) => set("taxpayer", { ...profile.taxpayer, occupation: e.target.value })} /></FormField>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{profile.taxYear} standard deduction for {FILING_STATUS_LABEL[profile.filingStatus].toLowerCase()}: <span className="font-medium text-foreground">{usd0.format(t.standardDeduction[profile.filingStatus])}</span> (federal and Arizona).</p>
      </Section>

      <Section title="Household & dependents" description="Birth dates decide the credit: under 17 at year end → $2,200 Child Tax Credit (+$100 AZ); otherwise $500 (+$25 AZ). Only the last 4 of an SSN is stored.">
        <Repeater<Dependent>
          items={profile.dependents}
          onChange={(v) => set("dependents", v)}
          create={() => ({ id: newId("dep"), name: "", relationship: "son", birthDate: "", monthsLivedWithYou: 12, hasSsn: true })}
          addLabel="Add dependent"
          render={(d, patch) => {
            const r = classifyDependent(d, profile.taxYear, t);
            return (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="Name"><Input value={d.name} onChange={(e) => patch({ name: e.target.value })} /></FormField>
                  <FormField label="Relationship">
                    <Select value={d.relationship} onValueChange={(v) => patch({ relationship: v as Dependent["relationship"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RELATIONSHIPS.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Birth date"><DatePicker value={d.birthDate} onChange={(v) => patch({ birthDate: v })} /></FormField>
                  <FormField label="Months lived with you"><NumberInput value={d.monthsLivedWithYou} onChange={(n) => patch({ monthsLivedWithYou: Math.min(12, Math.max(0, n)) })} step="1" min={0} /></FormField>
                  {["fiancee", "partner", "parent", "other"].includes(d.relationship) && (
                    <FormField label={`Their gross income ${profile.taxYear}`}><NumberInput value={d.grossIncome ?? 0} onChange={(n) => patch({ grossIncome: n })} min={0} /></FormField>
                  )}
                  <FormField label="SSN last 4"><Input value={d.ssnLast4 ?? ""} maxLength={4} inputMode="numeric" onChange={(e) => patch({ ssnLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></FormField>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm"><Switch checked={d.hasSsn} onCheckedChange={(v) => patch({ hasSsn: v })} /> Has an SSN</label>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm"><Switch checked={Boolean(d.student)} onCheckedChange={(v) => patch({ student: v })} /> Full-time student</label>
                </div>
                <div className={cn("flex gap-2 rounded-md px-3 py-2 text-xs", r.credit === "none" ? "bg-warning/10" : "bg-success/10")}>
                  {r.credit === "none" ? <CircleAlert className="h-4 w-4 shrink-0 text-warning" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                  <div>
                    <p className="font-medium text-foreground">{r.credit === "ctc" ? `Child Tax Credit ${usd0.format(r.federalAmount)}` : r.credit === "odc" ? `Credit for other dependents ${usd0.format(r.federalAmount)}` : "No federal credit as entered"}{r.azCredit ? ` · AZ ${usd0.format(r.azCredit)}` : ""}{r.qualifiesForHoh ? " · qualifies you for head of household" : ""}</p>
                    {r.reasons.map((x) => <p key={x} className="text-muted-foreground">{x}</p>)}
                  </div>
                </div>
              </div>
            );
          }}
        />
      </Section>

      <Section title="W-2 jobs" description="Copy the boxes from each W-2. Box 12 401(k) money is already left out of box 1.">
        <Repeater<W2Job>
          items={profile.w2Jobs}
          onChange={(v) => set("w2Jobs", v)}
          create={() => ({ id: newId("w2"), employer: "", wages: 0, fedWithheld: 0, ssWages: 0, medicareWages: 0, stateWages: 0, stateWithheld: 0 })}
          addLabel="Add W-2"
          empty="No W-2 yet. Add your job so the dashboard can show how the business changes your total tax."
          render={(j, patch) => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Employer" className="sm:col-span-2"><Input value={j.employer} onChange={(e) => patch({ employer: e.target.value })} /></FormField>
                <FormField label="Box 1 · Wages"><NumberInput value={j.wages} onChange={(n) => patch({ wages: n, ssWages: j.ssWages || n, medicareWages: j.medicareWages || n, stateWages: j.stateWages || n })} min={0} /></FormField>
                <FormField label="Box 2 · Federal withheld"><NumberInput value={j.fedWithheld} onChange={(n) => patch({ fedWithheld: n })} min={0} /></FormField>
                <FormField label="Box 3 · Social Security wages"><NumberInput value={j.ssWages} onChange={(n) => patch({ ssWages: n })} min={0} /></FormField>
                <FormField label="Box 5 · Medicare wages"><NumberInput value={j.medicareWages} onChange={(n) => patch({ medicareWages: n })} min={0} /></FormField>
                <FormField label="Box 16 · AZ wages"><NumberInput value={j.stateWages} onChange={(n) => patch({ stateWages: n })} min={0} /></FormField>
                <FormField label="Box 17 · AZ withheld"><NumberInput value={j.stateWithheld} onChange={(n) => patch({ stateWithheld: n })} min={0} /></FormField>
                <FormField label="Box 12 · 401(k) (D/E)"><NumberInput value={j.retirement401k ?? 0} onChange={(n) => patch({ retirement401k: n })} min={0} /></FormField>
                <FormField label="Qualified overtime premium"><NumberInput value={j.qualifiedOvertime ?? 0} onChange={(n) => patch({ qualifiedOvertime: n })} min={0} /></FormField>
              </div>
              <CustomFieldsRepeater value={j.custom} onChange={(v) => patch({ custom: v })} addLabel="Add W-2 field" placeholderLabel="Box 14 / note" />
            </div>
          )}
        />
      </Section>

      <Section title="Businesses" description="Each one is its own Schedule C. Ledger entries, trips and hours are assigned to one.">
        <Repeater<Business>
          items={profile.businesses}
          onChange={(v) => set("businesses", v.length ? v : profile.businesses)}
          create={() => ({ id: newId("biz"), name: "", entity: "single_member_llc", activity: "", accountingMethod: "cash" })}
          addLabel="Add business"
          render={(b, patch) => (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Name"><Input value={b.name} onChange={(e) => patch({ name: e.target.value })} /></FormField>
              <FormField label="What it does (Sch. C line A)"><Input value={b.activity} onChange={(e) => patch({ activity: e.target.value })} /></FormField>
              <FormField label="NAICS code (line B)"><Input value={b.naicsCode ?? ""} onChange={(e) => patch({ naicsCode: e.target.value })} placeholder="e.g. 541511" /></FormField>
              <FormField label="EIN last 4"><Input value={b.einLast4 ?? ""} maxLength={4} onChange={(e) => patch({ einLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></FormField>
              <FormField label="Entity">
                <Select value={b.entity} onValueChange={(v) => patch({ entity: v as Business["entity"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="single_member_llc">Single-member LLC</SelectItem><SelectItem value="sole_prop">Sole proprietor</SelectItem></SelectContent>
                </Select>
              </FormField>
              <FormField label="Started (year)"><NumberInput value={b.startedYear ?? 0} onChange={(n) => patch({ startedYear: n || undefined })} step="1" /></FormField>
              <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2"><Switch checked={Boolean(b.isServiceBusiness)} onCheckedChange={(v) => patch({ isServiceBusiness: v })} /> Consulting / professional services (affects QBI at high income)</label>
            </div>
          )}
        />
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Home & home office" description="Enter mortgage interest, property tax, utilities and insurance in the ledger with the Home categories; the office share moves to Schedule C.">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><Switch checked={ho.enabled} onCheckedChange={(v) => set("homeOffice", { ...ho, enabled: v })} /> I use part of my home regularly and only for the business</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Method">
                <Select value={ho.method} onValueChange={(v) => set("homeOffice", { ...ho, method: v as "simplified" | "actual" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="simplified">Simplified — $5 / sq ft, max 300</SelectItem><SelectItem value="actual">Actual expenses (Form 8829)</SelectItem></SelectContent>
                </Select>
              </FormField>
              <FormField label="Months used"><NumberInput value={ho.monthsUsed} onChange={(n) => set("homeOffice", { ...ho, monthsUsed: Math.min(12, Math.max(1, n)) })} step="1" min={1} /></FormField>
              <FormField label="Home square footage"><NumberInput value={ho.homeSqft} onChange={(n) => set("homeOffice", { ...ho, homeSqft: n })} step="1" min={0} /></FormField>
              <FormField label="Office square footage"><NumberInput value={ho.officeSqft} onChange={(n) => set("homeOffice", { ...ho, officeSqft: n })} step="1" min={0} /></FormField>
            </div>
            {ho.homeSqft > 0 && ho.officeSqft > 0 && <p className="text-xs text-muted-foreground">Office is {((ho.officeSqft / ho.homeSqft) * 100).toFixed(1)}% of the home. Simplified method: {usd0.format(Math.min(300, ho.officeSqft) * 5 * (ho.monthsUsed / 12))}.</p>}
          </div>
        </Section>

        <Section title="Vehicle" description={`${profile.taxYear} standard rate: ${(t.mileageRate * 100).toFixed(1)}¢ per business mile. Parking and tolls are deductible on top.`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Method">
              <Select value={profile.vehicle.method} onValueChange={(v) => set("vehicle", { ...profile.vehicle, method: v as "standard" | "actual" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="standard">Standard mileage rate</SelectItem><SelectItem value="actual">Actual costs × business %</SelectItem></SelectContent>
              </Select>
            </FormField>
            <FormField label="Vehicle"><Input value={profile.vehicle.description} onChange={(e) => set("vehicle", { ...profile.vehicle, description: e.target.value })} placeholder="2022 Toyota Tacoma" /></FormField>
            <FormField label="Total miles driven this year"><NumberInput value={profile.vehicle.totalMiles} onChange={(n) => set("vehicle", { ...profile.vehicle, totalMiles: n })} step="1" min={0} /></FormField>
            <FormField label="Date placed in service"><DatePicker value={profile.vehicle.placedInService ?? ""} onChange={(v) => set("vehicle", { ...profile.vehicle, placedInService: v })} /></FormField>
          </div>
        </Section>
      </div>

      <Section title="Adjustments, credits & other income" description="Things that aren't ledger transactions.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ADJUSTMENTS.map((a) => (
            <FormField key={a.key} label={a.label}>
              <NumberInput value={profile.adjustments[a.key] ?? 0} onChange={(n) => set("adjustments", { ...profile.adjustments, [a.key]: n })} />
              {a.hint && <span className="block text-[11px] text-muted-foreground">{a.hint}</span>}
            </FormField>
          ))}
        </div>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Estimated tax payments" description="Quarterly payments you've made (1040-ES / AZ 140ES). Or record them in the ledger.">
          <Repeater
            items={profile.estimatedPayments}
            onChange={(v) => set("estimatedPayments", v)}
            create={() => ({ id: newId("est"), date: new Date().toISOString().slice(0, 10), jurisdiction: "federal" as const, amount: 0 })}
            addLabel="Add payment"
            render={(p, patch) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Date"><DatePicker value={p.date} onChange={(v) => patch({ date: v })} /></FormField>
                <FormField label="To">
                  <Select value={p.jurisdiction} onValueChange={(v) => patch({ jurisdiction: v as "federal" | "arizona" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="federal">IRS</SelectItem><SelectItem value="arizona">Arizona</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <FormField label="Amount"><NumberInput value={p.amount} onChange={(n) => patch({ amount: n })} min={0} /></FormField>
              </div>
            )}
          />
        </Section>

        <Section title="Prior years" description="Past Schedule C results, for the IRS 3-of-5-years profit test.">
          <Repeater
            items={profile.priorYears}
            onChange={(v) => set("priorYears", v)}
            create={() => ({ id: newId("py"), year: profile.taxYear - 1, netProfit: 0 })}
            addLabel="Add year"
            render={(p, patch) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Year"><NumberInput value={p.year} onChange={(n) => patch({ year: n })} step="1" /></FormField>
                <FormField label="Net profit (negative = loss)"><NumberInput value={p.netProfit} onChange={(n) => patch({ netProfit: n })} /></FormField>
              </div>
            )}
          />
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Auto-categorize rules" description="When a description contains the text, the import uses this category before asking the AI.">
          <Repeater<CategoryRule>
            items={profile.rules}
            onChange={(v) => set("rules", v)}
            create={() => ({ id: newId("rule"), match: "", category: "exp_software" })}
            addLabel="Add rule"
            render={(r, patch) => (
              <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr_90px]">
                <FormField label="Contains"><Input value={r.match} onChange={(e) => patch({ match: e.target.value })} placeholder="SUPABASE" /></FormField>
                <FormField label="Category"><CategorySelect value={r.category} onChange={(v) => patch({ category: v })} profile={profile} /></FormField>
                <FormField label="Biz %"><NumberInput value={r.businessUsePct ?? 100} onChange={(n) => patch({ businessUsePct: n })} step="1" /></FormField>
              </div>
            )}
          />
        </Section>

        <Section title="Custom categories" description="Your own labels. They roll up into “Other expenses” (Sch. C line 27a) or other income unless you say otherwise.">
          <Repeater
            items={profile.customCategories}
            onChange={(v) => set("customCategories", v)}
            create={() => ({ id: newId("cat"), label: "", kind: "expense" as const, line: "" })}
            addLabel="Add category"
            render={(c, patch) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Label"><Input value={c.label} onChange={(e) => patch({ label: e.target.value })} placeholder="Trade shows" /></FormField>
                <FormField label="Type">
                  <Select value={c.kind} onValueChange={(v) => patch({ kind: v as "income" | "expense" | "personal" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="expense">Business expense</SelectItem><SelectItem value="income">Business income</SelectItem><SelectItem value="personal">Personal / tracking only</SelectItem></SelectContent>
                  </Select>
                </FormField>
                <FormField label="Form line (optional)"><Input value={c.line} onChange={(e) => patch({ line: e.target.value })} placeholder="Sch. C line 27a" /></FormField>
              </div>
            )}
          />
        </Section>
      </div>

      <Section title="Other details" description="Anything else your preparer should know: account numbers (last 4), PINs to look up, notes.">
        <CustomFieldsRepeater value={profile.custom} onChange={(v) => set("custom", v)} addLabel="Add detail" placeholderLabel="e.g. IRS IP PIN location" />
      </Section>
    </div>
  );
}
