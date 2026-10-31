import { motion } from "motion/react";
import {
  Axe, Blocks, BrickWall, Brush, Cable, Cog, Construction, Container, Cylinder, DoorOpen, Drill, Droplets, Fence, Footprints, Glasses, Grid3x3, Hammer, Hand, HardHat, Hexagon,
  KeyRound, Layers, Lightbulb, Link2, Lock, Mountain, Package, PaintBucket, PaintRoller, Pickaxe, Pipette, Plug, Plus, Ruler, Scissors, Shield, Shovel, Slice, Sprout, TreePine, Waves, Weight, Wind, Wrench, Zap, type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "../lib/api";
import { useMoney, useQuote, useToast } from "../lib/context";
import { Availability } from "./ui";

// First match wins, so specific words come before general ones.
const ITEM_ICONS: [RegExp, LucideIcon][] = [
  [/jembe|hoe|rake/i, Sprout], [/panga|slasher|machete/i, Slice], [/sururu|pick|mattock/i, Pickaxe], [/shovel|spade|karai|wheelbarrow/i, Shovel], [/axe/i, Axe],
  [/cement|adhesive|putty|plaster|mortar/i, Package], [/ballast|sand|hardcore|quarry/i, Mountain], [/block|brick|tile/i, BrickWall],
  [/mesh|chicken|chain ?link/i, Grid3x3], [/barbed/i, Fence], [/bar\b|bars|y1\d|d\d+|hoop|rebar|steel/i, Layers], [/binding|wire\b/i, Link2], [/nail|screw|bolt|nut/i, Hexagon], [/welding|electrode/i, Zap],
  [/mabati|iron sheet|ridge|gutter|roof|box profile/i, Layers], [/timber|cypress|plywood|board/i, TreePine],
  [/drill/i, Drill], [/grinder|circular|saw\b|hacksaw/i, Cog], [/hammer/i, Hammer], [/pliers|tool kit|tool set|spanner|wrench|plane|chisel|screwdriver/i, Wrench], [/level|tape|plumb|measure|timazi/i, Ruler], [/trowel|mwiko|float/i, Construction],
  [/roller/i, PaintRoller], [/brush/i, Brush], [/paint|emulsion|vinyl|enamel|gloss|undercoat|varnish|thinner|weather/i, PaintBucket], [/sandpaper/i, Scissors],
  [/tank/i, Container], [/pump/i, Waves], [/pipe|ppr|hdpe|pvc|hose|teflon|solvent/i, Cylinder], [/valve|tap|meter|fitting|basin|toilet/i, Droplets],
  [/bulb|light/i, Lightbulb], [/cable|conduit/i, Cable], [/socket|switch|breaker|consumer|tester/i, Plug],
  [/padlock|lock/i, Lock], [/hinge|handle|door/i, DoorOpen], [/key/i, KeyRound],
  [/helmet|hard hat|vest/i, HardHat], [/glove/i, Hand], [/boot/i, Footprints], [/goggle/i, Glasses], [/mask/i, Wind], [/safety/i, Shield],
  [/weight|kg/i, Weight], [/pipette/i, Pipette], [/stock|kit/i, Blocks],
];

export const iconFor = (name: string): LucideIcon => ITEM_ICONS.find(([re]) => re.test(name))?.[1] ?? Package;

/** A real photo when there is one; otherwise a blueprint tile, so nothing shows a picture of the wrong item. */
export function ProductImage({ src, name, className, iconClass = "size-1/3" }: { src?: string; name: string; className?: string; iconClass?: string }) {
  if (src) return <img src={src} alt={name} loading="lazy" className={`object-cover ${className ?? ""}`} />;
  const Icon = iconFor(name);
  return (
    <div role="img" aria-label={name} className={`blueprint grid place-items-center text-white ${className ?? ""}`}>
      <Icon className={`${iconClass} stroke-[1.25]`} aria-hidden="true" />
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const money = useMoney();
  const { add } = useQuote();
  const toast = useToast();
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="card group flex h-full flex-col overflow-hidden rounded-2xl">
      <Link to={`/shop/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <ProductImage src={product.images[0]} name={product.name} className="size-full transition-transform duration-700 group-hover:scale-105" />
        <span className="glass-strong absolute left-2.5 top-2.5 rounded-full px-2.5 py-1"><Availability value={product.availability} /></span>
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <p className="truncate text-xs text-muted">{product.brand || product.categoryName}</p>
        <Link to={`/shop/${product.slug}`} className="mt-0.5 line-clamp-2 min-h-8 py-1 text-sm font-semibold leading-snug hover:text-brand sm:text-[0.95rem]">{product.name}</Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="min-w-0 font-display text-sm font-bold leading-none sm:text-base">{money(product.price)}<span className="block truncate pt-1 font-sans text-xs font-normal text-muted">{product.price > 0 ? `per ${product.unit}` : `Sold per ${product.unit}`}</span></p>
          <button
            onClick={() => { add(product); toast(`${product.name} added to your enquiry list`); }}
            className="btn btn-ghost btn-sm shrink-0 !px-2 sm:!px-2.5" aria-label={`Add ${product.name} to enquiry list`}
          >
            <Plus className="size-4" /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}
