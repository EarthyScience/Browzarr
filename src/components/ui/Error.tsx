import React from "react";
import "./css/Error.css";
import { useErrorStore } from "@/utils/GlobalStates";
import { ErrorList } from "./ErrorList";
import { useShallow } from "zustand/shallow";
import { Button } from "./button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

const Error = () => {
	const { error, setError } = useErrorStore(
		useShallow((state) => ({
			error: state.error,
			setError: state.setError,
		})),
	);
	return (
		<>
			{error && (
				<Dialog open={true} onOpenChange={(e) => setError(null)}>
					<DialogContent aria-describedby="Error Message">
						<DialogTitle className="text-center text-lg font-semibold">
							Error: {ErrorList[error as keyof typeof ErrorList].title}
						</DialogTitle>
						<div className="error-message">
							{ErrorList[error as keyof typeof ErrorList].description}
						</div>
						<div className="flex justify-center mt-[10px]">
							<Button
								variant="pink"
								className="cursor-pointer hover:scale-[1.1]"
								onClick={(e) => setError(null)}
							>
								Okay
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
};

export default Error;
