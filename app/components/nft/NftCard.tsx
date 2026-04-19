import { Link } from "@remix-run/react";

interface NftCardProps {
  id: string;
  assetCode: string;
  serialNumber: number;
  status: string;
  physicalStatus: string | null;
  productTitle: string;
  mockupUrl: string;
  isBurnToClaim: boolean;
  explorerUrl: string | null;
}

const statusColors: Record<string, string> = {
  MINTING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MINTED: "bg-green-500/10 text-green-400 border-green-500/20",
  TRANSFERRED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  BURNED: "bg-red-500/10 text-red-400 border-red-500/20",
  MINT_FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function NftCard(props: NftCardProps) {
  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden hover:border-primary/30 transition-colors">
      <div className="aspect-square bg-surface-container-high flex items-center justify-center p-4">
        {props.mockupUrl ? (
          <img src={props.mockupUrl} alt={props.productTitle} className="w-full h-full object-contain" />
        ) : (
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">image</span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-sm truncate">{props.productTitle}</h3>
          <p className="text-xs text-on-surface-variant font-mono">{props.assetCode} · #{props.serialNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${statusColors[props.status] || ""}`}>
            {props.status === "MINTED" ? "Active" : props.status}
          </span>
          {props.physicalStatus && (
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
              {props.physicalStatus.replace("_", " ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {props.status === "MINTED" && props.isBurnToClaim && (
            <Link to={`/my-nfts/${props.id}/burn`} className="text-xs font-bold text-amber-400 hover:underline">
              Burn & Claim
            </Link>
          )}
          {props.explorerUrl && (
            <a href={props.explorerUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              Explorer →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
