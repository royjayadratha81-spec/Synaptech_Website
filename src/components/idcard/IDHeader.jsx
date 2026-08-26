import { FaGraduationCap } from "react-icons/fa";
import logo from "../../assets/Synaptech_Education_Logo.png";

export default function IDHeader() {
    return (
        <div className="bg-gradient-to-r
from-cyan-50
via-white
to-indigo-50
text-slate-900">

            <div className="absolute right-0 top-0 w-44 h-44 rounded-full bg-white/10 blur-3xl"></div>

            <div className="flex items-center justify-between gap-8">

                <div className="relative w-32 h-32 flex items-center justify-center">

    {/* Soft Glow */}
    <div
        className="
            absolute
            w-24
            h-24
            rounded-full
            bg-white/70
            blur-xl
        "
    />

    {/* Logo */}
    <img
        src={logo}
        alt="Synaptech Logo"
        className="
            relative
            z-10
            w-24
            h-24
            object-contain
            drop-shadow-2xl
        "
    />

</div>

                <div>

                    <h1 className="text-[34px] font-extrabold tracking-tight text-slate-900">
                        SYNAPTECH EDUCATION
                    </h1>

                    <div className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-lg">

    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>

    Official Student Identity Card

</div>

                </div>
                <div className="ml-auto">

    <div className="bg-blue-600 text-white shadow-lg px-4 py-2 rounded-full backdrop-blur-md">

        <p className="text-sm font-semibold">
            VERIFIED STUDENT
        </p>

    </div>

</div>

            </div>

        </div>
    );
}