import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-lp py-24">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-4 h-4 w-1/2" />
      <Skeleton className="mt-12 h-64 w-full" />
    </div>
  );
}
