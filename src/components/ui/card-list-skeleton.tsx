import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface CardListSkeletonProps {
    count?: number
}

export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
    return (
        <div className="grid gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Left Side: Icon + Info */}
                            <div className="flex items-start gap-4 flex-1">
                                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-6 w-[200px]" />
                                    <Skeleton className="h-4 w-[150px]" />
                                    <div className="flex gap-2 pt-1">
                                        <Skeleton className="h-5 w-[80px]" />
                                        <Skeleton className="h-5 w-[80px]" />
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Stats */}
                            <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-[60px] md:ml-auto" />
                                    <Skeleton className="h-8 w-[80px] md:ml-auto" />
                                </div>
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-[60px] md:ml-auto" />
                                    <Skeleton className="h-4 w-[100px] md:ml-auto" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
