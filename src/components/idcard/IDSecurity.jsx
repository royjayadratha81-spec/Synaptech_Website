import { FaShieldAlt } from "react-icons/fa";

export default function IDSecurity(){

return(

<div className="absolute inset-0 pointer-events-none overflow-hidden">

<div className="absolute top-24 left-8 opacity-5 rotate-12 text-[140px] font-black">

AI

</div>

<div className="absolute bottom-20 right-10 opacity-5 rotate-[-18deg] text-[120px] font-black">

SYNAPTECH

</div>

<div className="absolute top-5 right-5">

<div className="w-20 h-20 rounded-full border-4 border-blue-300/30 flex items-center justify-center">

<FaShieldAlt
size={30}
className="text-blue-400/30"
/>

</div>

</div>

</div>

);

}