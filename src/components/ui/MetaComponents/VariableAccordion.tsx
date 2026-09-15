import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useGlobalStore } from '@/GlobalStates/GlobalStore';
import { useShallow } from 'zustand/shallow';
import { useIsMobile } from '@/hooks';
import { GetDimInfo } from '@/utils/HelperFuncs';
import { GetAttributes } from '@/components/zarr/ZarrLoaderLRU';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator, Button, Input } from '@/components/ui'
import { Loader2 } from "lucide-react";

export const VariableAccordion = ({variables, setMeta} : {variables:string[], setMeta: React.Dispatch<React.SetStateAction<Record<string, any> | undefined>>}) => {
	const { zMeta, metadata, initStore, setMetadata } = useGlobalStore(
		useShallow((state) => ({
		variables: state.variables,
		zMeta: state.zMeta,
		metadata: state.metadata,
		initStore: state.initStore,
		setMetadata: state.setMetadata,
		}))
	);

	const [selectedVar, setSelectedVar] = useState<string | null>(null);
	const [isLoadingVar, setIsLoadingVar] = useState<string | null>(null);
	const activeRequest = useRef<string | null>(null);
	const [query, setQuery] = useState("");
	// root *open by default* (collapsible but starts open)
	const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(["root"]);

	// Build nested variable tree
	const tree = useMemo(() => {
		const q = query.toLowerCase().trim();
		let filteredVars = variables ?? [];

		if (q) {
		filteredVars = filteredVars.filter((variable) =>
			variable.toLowerCase().includes(q)
		);
		}

		const buildTree = (vars: string[]) => {
		const t: any = {};
		vars.forEach((v) => {
			const parts = v.split("/");
			let current = t;
			parts.forEach((p, i) => {
			if (!current[p]) current[p] = i === parts.length - 1 ? null : {};
			current = current[p];
			});
		});
		return t;
		};

		return buildTree(filteredVars);
	}, [query, variables]);

	// Get all group paths (for auto-open when searching)
	const getGroupPaths = (subtree: any, basePath = ""): string[] => {
		let paths: string[] = [];
		Object.entries(subtree).forEach(([key, value]) => {
		const currentPath = basePath ? `${basePath}/${key}` : key;
		if (value && typeof value === "object") {
			paths.push(currentPath);
			paths = paths.concat(getGroupPaths(value, currentPath));
		}
		});
		return paths;
	};

	// Auto-open accordions that contain matches
	useEffect(() => {
		if (query.trim()) {
		const openPaths = getGroupPaths(tree);
		setOpenAccordionItems(["root", ...openPaths]);
		} else {
		// when not searching keep root open by default
		setOpenAccordionItems(["root"]);
		}
	}, [query, tree]);

	// Handle variable selection
	const handleVariableSelect = (val: string, idx: number) => {

			setIsLoadingVar(val);
			setSelectedVar(val);
			activeRequest.current = val;
			Promise.all([GetDimInfo(val), GetAttributes(val)]).then(([dimInfo, attr]) => {
			if (activeRequest.current !== val) return;

			const relevant = zMeta?.find((e: any) => e.name === val);
			if (relevant) {
				setMeta({
				...relevant,
				dimInfo: {
					dimArrays: dimInfo.dimArrays,
					dimNames: dimInfo.dimNames,
					dimUnits: dimInfo.dimUnits,
				},
				});
			}
			setMetadata(attr);
			setIsLoadingVar(null);
			}).catch((err) => {
			if (activeRequest.current === val) {
				setIsLoadingVar(null);
			}
			console.error("Failed to fetch dimension info or attributes:", err);
			});
	}

	useEffect(() => {
		setSelectedVar(null);
		setMeta(undefined);
		setMetadata(null);
	}, [initStore, setMetadata]);

	// Variable item renderer (keeps separator between variables in same group)
	const VariableItem = ({ val, idx, arrayLength }: { val: string; idx: number; arrayLength: number }) => {
		const variableName = val.split('/').pop() || val;
		const isLastItem = idx === arrayLength - 1;
		return (
		<React.Fragment key={val}>
			<div
			className={`cursor-pointer pl-2 py-1 text-sm rounded flex items-center justify-between transition-colors ${
				selectedVar === val 
				? "bg-primary text-primary-foreground" 
				: "hover:bg-muted"
			}`}
			onClick={() => handleVariableSelect(val, idx)}
			>
			<span>{variableName}</span>
			{isLoadingVar === val && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
			</div>
			{!isLastItem && <Separator className="my-1" />}
		</React.Fragment>
		);
	};
	// render a subtree inside an Accordion (ensures AccordionItem children are direct children of an Accordion)
	const renderSubtreeAccordion = (subtree: any, basePath = "") => {
		// Determine entries (keep variables first then groups for clarity)
		const entries = Object.entries(subtree);
		const variableEntries = entries.filter(([_, v]) => v === null);
		const groupEntries = entries.filter(([_, v]) => v && typeof v === "object");
		return (
		<Accordion
			key={basePath || "__root_inner__"}
			type="multiple"
			value={openAccordionItems}
			onValueChange={setOpenAccordionItems}
			className="w-full"
		>
			{/* variables at this level */}
			{variableEntries.length > 0 && (
			<div className="px-1">
				{variableEntries.map(([name], idx) => {
				const varPath = basePath ? `${basePath}/${name}` : name;
				return (
					<VariableItem
					key={varPath}
					val={varPath}
					idx={idx}
					arrayLength={variableEntries.length}
					/>
				);
				})}
			</div>
			)}

			{/* groups at this level */}
			{groupEntries.map(([name, subtreeValue]) => {
			const currentPath = basePath !== '' ? `${basePath}/${name}` : name;
			return (
				<AccordionItem key={currentPath} value={currentPath}>
				<AccordionTrigger className="cursor-pointer pl-2">
					{name}
				</AccordionTrigger>
				<AccordionContent className="flex flex-col pl-2">
					{/* recursively render children inside their own Accordion */}
					{renderSubtreeAccordion(subtreeValue, currentPath)}
				</AccordionContent>
				</AccordionItem>
			);
			})}
		</Accordion>
		);
	};

	// render full Variable list under "root" accordion item
	const VariableList = (
		<div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden">
		{Object.keys(tree).length > 0 ? (
			<Accordion
			type="multiple"
			className="w-full"
			value={openAccordionItems}
			onValueChange={setOpenAccordionItems}
			>
			<AccordionItem key="root" value="root">
				<AccordionContent className="flex flex-col">
				{/* render the top-level subtree inside its own Accordion so nested AccordionItems are legal */}
				{renderSubtreeAccordion(tree, "")}
				</AccordionContent>
			</AccordionItem>
			</Accordion>
		) : (
			<div className="text-center text-muted-foreground py-2">
			{query ? "No variables found matching your search." : "No variables available."}
			</div>
		)}
		</div>
	);
	return (
		<div>
			<div className="flex items-center gap-2 mb-4 justify-center max-w-[240px] md:max-w-sm mx-auto flex-shrink-0">
            <Input
              placeholder="Search variable..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="secondary" onClick={() => setQuery("")}>
              Clear
            </Button>
          </div>
			{VariableList}
		</div>
	)
}
