// components/ui/skeleton-card.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 bg-gray-800 animate-pulse"></div>
      <CardContent className="p-3">
        <div className="h-5 w-4/5 bg-gray-800 rounded animate-pulse mb-2"></div>
        <div className="h-2 w-full bg-gray-800 rounded animate-pulse mb-4"></div>
        <div className="flex justify-between">
          <div className="h-3 w-1/4 bg-gray-800 rounded animate-pulse"></div>
          <div className="h-3 w-1/4 bg-gray-800 rounded animate-pulse"></div>
          <div className="h-3 w-1/4 bg-gray-800 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  )
}