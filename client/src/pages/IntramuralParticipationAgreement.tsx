import PageCardClose from "@/components/PageCardClose";
import { Header } from "@/components/Header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function IntramuralParticipationAgreement() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="px-4 py-10">
        <Card className="relative mx-auto max-w-3xl border-2">
          <PageCardClose href="/intramurals" />

          <CardHeader className="pr-16">
            <CardTitle>
              Intramural Sports & Activities Participation Agreement
            </CardTitle>

            <p className="text-sm text-gray-600">
              Agreement version 2026-09-02-v1
            </p>
          </CardHeader>

          <CardContent className="space-y-5 text-base leading-7">
            <p>
              CoogsNation provides an online platform through which
              members may independently organize and participate in
              sports and recreational activities.
            </p>

            <p>
              Teams, games, practices and activities are independently
              organized by participating members. They are not operated
              or controlled by NGF Productions LLC.
            </p>

            <p className="font-semibold">
              Participation in physical sports and activities involves
              inherent risks, including the risk of injury.
            </p>

            <p className="font-semibold">
              By accepting this agreement, I voluntarily choose to
              participate and accept the risks involved in physical
              sports and activities.
            </p>

            <p>
              Acceptance of this agreement is optional for ordinary
              CoogsNation membership but is required before membership
              activation when registration originates through
              Intramurals, and before later Intramural participation by
              a member who has not previously accepted it.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
