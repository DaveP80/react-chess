import { Repeat } from "lucide-react";

export default function FlipBoard({setBoardOrientation}) {

    const flipBoard = () => {
        setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));
    };
    return (

        // then in JSX:
        <div className="flex justify-end mt-1">
            <button onClick={flipBoard} className="p-2 rounded hover:bg-slate-200 transition-colors" title="Flip board">
                <Repeat size={20} className="text-slate-700" />
            </button>
        </div>
    )
}
