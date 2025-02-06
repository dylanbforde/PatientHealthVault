import { motion } from "framer-motion";
import { format } from "date-fns";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { type HealthRecord } from "@shared/schema";
import { ViewRecordDialog } from "@/pages/dashboard";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface TimelineProps {
  records: HealthRecord[];
}

export function Timeline({ records }: TimelineProps) {
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  
  // Sort records by date, newest first
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />
      
      <div className="space-y-8">
        {sortedRecords.map((record, index) => (
          <Dialog 
            key={record.id}
            open={selectedRecord?.id === record.id}
            onOpenChange={(open) => !open && setSelectedRecord(null)}
          >
            <DialogTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 ${
                  index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                }`}
                onClick={() => setSelectedRecord(record)}
              >
                {/* Timeline content */}
                <div className={`w-1/2 ${index % 2 === 0 ? "text-right" : "text-left"}`}>
                  <Card className="inline-block cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <h3 className="font-medium">{record.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.date), "PPP")}
                      </p>
                      <p className="text-sm mt-1">{record.facility}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline dot */}
                <div className="relative flex-shrink-0 w-4 h-4">
                  <div className="absolute w-4 h-4 bg-background border-2 border-primary rounded-full" />
                  <div className="absolute w-3 h-3 bg-primary rounded-full animate-pulse" 
                       style={{ left: "2px", top: "2px" }} />
                </div>

                {/* Empty space for alignment */}
                <div className="w-1/2" />
              </motion.div>
            </DialogTrigger>
            {selectedRecord && <ViewRecordDialog record={selectedRecord} />}
          </Dialog>
        ))}
      </div>
    </div>
  );
}
