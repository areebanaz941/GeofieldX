import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureDetailsModal } from "@/components/FeatureDetailsModal";
import { getFeature } from "@/lib/api";
import type { IFeature } from "@shared/schema";

export default function FeatureDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const featureId = useMemo(() => params?.featureId as string | undefined, [params]);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const { data: feature, isLoading, isError } = useQuery<IFeature>({
    queryKey: ["/api/features", featureId],
    queryFn: async () => {
      if (!featureId) throw new Error("Missing feature id");
      return await getFeature(featureId);
    },
    enabled: !!featureId,
    staleTime: 0,
  });

  useEffect(() => {
    // If the modal closes, go back to the list
    if (!isModalOpen && params?.featureType) {
      setLocation(`/features/${params.featureType}`);
    }
  }, [isModalOpen, params, setLocation]);

  if (!featureId) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Feature not found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">No feature id was provided.</p>
              <Button variant="outline" onClick={() => setLocation("/features/all")}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !feature) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Unable to load feature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Please try again.</p>
              <Button variant="outline" onClick={() => setLocation(`/features/${params?.featureType || "all"}`)}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-0">
      <FeatureDetailsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        feature={feature}
      />
    </div>
  );
}

