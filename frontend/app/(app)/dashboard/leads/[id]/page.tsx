import { LeadDetailView } from "@/components/dashboard/lead-detail-view";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return <LeadDetailView id={params.id} />;
}
