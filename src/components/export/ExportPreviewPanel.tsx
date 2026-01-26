import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  ShoppingCart,
  Eye,
  Download,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DPGFLine, 
  PlanningTask, 
  PurchaseItem,
  ExportResult 
} from '@/hooks/useExportEngine';

interface ExportPreviewPanelProps {
  result: ExportResult;
  onDownloadDPGF?: () => void;
  onDownloadNotice?: () => void;
  onDownloadPlanning?: () => void;
  onDownloadPurchase?: () => void;
  onDownloadJSON?: () => void;
}

export function ExportPreviewPanel({
  result,
  onDownloadDPGF,
  onDownloadNotice,
  onDownloadPlanning,
  onDownloadPurchase,
  onDownloadJSON,
}: ExportPreviewPanelProps) {
  if (!result.success || !result.data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucun export disponible</p>
      </Card>
    );
  }

  const { exports } = result.data;

  return (
    <Tabs defaultValue="dpgf" className="w-full">
      <TabsList className="grid grid-cols-4 w-full">
        {exports.dpgf && (
          <TabsTrigger value="dpgf" className="gap-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">DPGF</span>
          </TabsTrigger>
        )}
        {exports.noticeDescriptive && (
          <TabsTrigger value="notice" className="gap-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Notice</span>
          </TabsTrigger>
        )}
        {exports.planning && (
          <TabsTrigger value="planning" className="gap-1">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Planning</span>
          </TabsTrigger>
        )}
        {exports.purchaseList && (
          <TabsTrigger value="purchase" className="gap-1">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Achats</span>
          </TabsTrigger>
        )}
      </TabsList>

      {/* DPGF Preview */}
      {exports.dpgf && (
        <TabsContent value="dpgf" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">DPGF - Aperçu</CardTitle>
              <Button size="sm" variant="outline" onClick={onDownloadDPGF}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {exports.dpgf.lines.slice(0, 20).map((line: DPGFLine, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {line.ft_code}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{line.designation}</p>
                        <p className="text-xs text-muted-foreground">
                          {line.category} • {line.room}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-medium">
                          {line.quantity} {line.unit}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {exports.dpgf.lines.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      + {exports.dpgf.lines.length - 20} lignes supplémentaires
                    </p>
                  )}
                </div>
              </ScrollArea>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Total lignes</span>
                <span className="font-medium">{exports.dpgf.summary.total_lines}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* Notice Preview */}
      {exports.noticeDescriptive && (
        <TabsContent value="notice" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Notice Descriptive - Aperçu</CardTitle>
              <Button size="sm" variant="outline" onClick={onDownloadNotice}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {exports.noticeDescriptive.sections?.map((section: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-primary">
                          {section.ft_code}
                        </Badge>
                        <h3 className="font-semibold">{section.ft_label}</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {section.task_count} tâches
                        </Badge>
                      </div>
                      <div className="ml-4 space-y-3 border-l-2 border-muted pl-4">
                        {section.categories?.slice(0, 3).map((cat: any, catIndex: number) => (
                          <div key={catIndex}>
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" />
                              {cat.category}
                            </p>
                            <ul className="mt-1 space-y-1">
                              {cat.tasks?.slice(0, 2).map((task: any, taskIndex: number) => (
                                <li key={taskIndex} className="text-sm ml-4">
                                  • {task.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* Planning Preview */}
      {exports.planning && (
        <TabsContent value="planning" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Planning - Aperçu</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {exports.planning.total_duration} jours
                </Badge>
                <Button size="sm" variant="outline" onClick={onDownloadPlanning}>
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {/* Simple Gantt visualization */}
                <div className="space-y-2">
                  {exports.planning.gantt_data?.map((task: any, index: number) => {
                    const widthPercent = Math.max(5, (task.end - task.start) / Math.max(1, exports.planning.total_duration) * 100);
                    const leftPercent = (task.start / Math.max(1, exports.planning.total_duration)) * 100;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="relative"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {task.ft_code}
                          </Badge>
                          <span className="text-sm truncate flex-1">{task.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            J{task.start + 1} - J{task.end}
                          </span>
                        </div>
                        <div className="h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                            style={{
                              width: `${widthPercent}%`,
                              marginLeft: `${leftPercent}%`,
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* Purchase List Preview */}
      {exports.purchaseList && (
        <TabsContent value="purchase" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Liste des Achats - Aperçu</CardTitle>
              <Button size="sm" variant="outline" onClick={onDownloadPurchase}>
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {exports.purchaseList.items.map((item: PurchaseItem, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.product}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.ft_label}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {item.quantity} {item.unit}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Total produits</span>
                <span className="font-medium">{exports.purchaseList.summary.total_items}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
