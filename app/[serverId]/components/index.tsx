import MainSection from "./MainSection";
import SideBar from "./SideBar";

export default function ChatSection() {
    return (
        <div className="h-full w-full max-sm:w-[100dvw] max-sm:h-[100dvh] flex bg-black/70 backdrop-blur-[4px] overflow-hidden relative z-[300]">
            <SideBar />
            <MainSection />
        </div>
    )
}   