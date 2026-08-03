export default function InfoItem({

    label,

    value

}) {

    return (

        <div className="flex justify-between items-center py-4 border-b border-white/40">

            <div>

                <p className="text-sm uppercase tracking-wider font-semibold text-white/85">
    {label}
</p>

            </div>

            <div>

                <p className="text-lg font-bold text-white">

                    {value}

                </p>

            </div>

        </div>

    );

}