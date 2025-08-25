import React, {useState, useMemo} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGlobalStore } from "@/utils/GlobalStates";
import { useShallow } from "zustand/shallow";
import MetaDataInfo from "./MainPanel/MetaDataInfo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function VariablesTable() {
  const { variables, zMeta, setVariable } = useGlobalStore(
    useShallow((state) => ({
      variables: state.variables,
      zMeta: state.zMeta,
      setVariable: state.setVariable,
    }))
  );
  
  const [query, setQuery] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<any>(null);
  const [showMetaDialog, setShowMetaDialog] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return variables;
    return variables.filter((variable) =>
      variable.toLowerCase().includes(q)
    );
  }, [query, variables]);

  const handleViewDetails = (variable: string) => {
    const meta = zMeta?.find((e: any) => e.name === variable);
    setSelectedMeta(meta);
    setShowMetaDialog(true);
  };

  return (
    <div className="min-h-screen w-full flex items-start justify-center pt-[8vh] p-0 relative z-1">
      <Card className="w-full max-w-full md:max-w-[80%] shadow-xl rounded-2xl border-0 bg-transparent">
        <CardHeader className="gap-3">
          {/* <CardTitle className="text-2xl text-center">Variables</CardTitle> */}
          <div className="flex items-center gap-2 justify-center max-w-[240px] md:max-w-sm mx-auto">
            <Input
              placeholder="Search variable..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" onClick={() => setQuery("")}>Clear</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[65vh] rounded-md border-0">
            <Table>
              {/* <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Variable Name</TableHead>
                </TableRow>
              </TableHeader> */}
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((variable, idx) => (
                    <TableRow key={idx} className="hover:bg-gray">
                      <TableCell className="text-center">
                        <Dialog open={showMetaDialog && selectedMeta?.name === variable} onOpenChange={(open) => {
                          if (!open) {
                            setShowMetaDialog(false);
                            setSelectedMeta(null);
                          }
                        }}>
                          <DialogTrigger  asChild>
                            <Button 
                              variant="ghost" 
                              className="w-full text-center text-lg cursor-pointer"
                              onClick={() => handleViewDetails(variable)}
                            >
                              {variable}
                            </Button>
                          </DialogTrigger>
                          <DialogContent aria-describedby="Data information for selected variable" aria-description="Data information for selected variable" className="max-w-[85%] md:max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogTitle  className="text-center text-lg font-semibold">
                                {variable}
                              </DialogTitle>
                            <div className="mt-4">
                              {selectedMeta && (
                                <MetaDataInfo
                                  meta={selectedMeta}
                                  setShowMeta={setShowMetaDialog}
                                  noCard={true}
                                />
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground py-8">
                      {query ? "No variables found matching your search." : "No variables available."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
