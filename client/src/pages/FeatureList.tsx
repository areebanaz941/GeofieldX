import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Search, Filter, MapPin, Calendar, User, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllFeatures } from "@/lib/api";
import { IFeature } from "../../../shared/schema";

export default function FeatureList() {
  const { featureType } = useParams();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  const { data: features, isLoading } = useQuery({
    queryKey: ['/api/features'],
    queryFn: () => getAllFeatures(),
  });

  // Filter features based on type and search criteria
  const filteredFeatures = features?.filter((feature: IFeature) => {
    const matchesType = featureType === 'all' || feature.feaType.toLowerCase() === featureType?.toLowerCase();
    const matchesSearch = !searchQuery || 
      feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.feaNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || feature.feaStatus === statusFilter;
    const matchesState = stateFilter === 'all' || feature.feaState === stateFilter;
    
    return matchesType && matchesSearch && matchesStatus && matchesState;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Plan': return 'bg-orange-100 text-orange-800';
      case 'Under Construction': return 'bg-amber-100 text-amber-800';
      case 'As-Built': return 'bg-emerald-100 text-emerald-800';
      case 'Abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {featureType === 'all' ? 'All Features' : `${featureType} Features`}
          </h1>
          <p className="text-gray-600">
            {filteredFeatures.length} features found
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setLocation('/map')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          View on Map
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="Plan">Plan</SelectItem>
                <SelectItem value="Under Construction">Under Construction</SelectItem>
                <SelectItem value="As-Built">As-Built</SelectItem>
                <SelectItem value="Abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={featureType || 'all'} onValueChange={(value) => setLocation(`/features/${value}`)}>
              <SelectTrigger>
                <SelectValue placeholder="Feature type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tower">Towers</SelectItem>
                <SelectItem value="manhole">Manholes</SelectItem>
                <SelectItem value="fibercable">Fiber Cables</SelectItem>
                <SelectItem value="parcel">Parcels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feature List */}
      <div className="space-y-4">
        {filteredFeatures.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No features found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredFeatures.map((feature: IFeature) => (
            <Card key={feature._id.toString()} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {feature.name}
                      </h3>
                      <Badge variant="outline">
                        {feature.feaNo}
                      </Badge>
                      <Badge className={getStatusColor(feature.feaStatus)}>
                        {feature.feaStatus}
                      </Badge>
                      <Badge className={getStateColor(feature.feaState)}>
                        {feature.feaState}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Type: {feature.feaType} ({feature.specificType})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Updated: {formatDate(feature.lastUpdated)}</span>
                      </div>
                      {feature.maintenance && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Maintenance: {feature.maintenance}</span>
                        </div>
                      )}
                    </div>

                    {feature.remarks && (
                      <p className="text-sm text-gray-600 italic">
                        {feature.remarks}
                      </p>
                    )}

                    {feature.color && feature.feaType === 'Parcel' && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Color:</span>
                        <div 
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: feature.color }}
                        ></div>
                        <span className="text-sm text-gray-500">{feature.color}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation(`/features/${feature.feaType.toLowerCase()}/${feature._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}