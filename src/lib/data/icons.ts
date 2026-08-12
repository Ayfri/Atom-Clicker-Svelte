import type { Component } from 'svelte';
import { BuildingTypes, type BuildingType } from '$data/buildings';
import { CurrenciesTypes, type CurrencyName } from '$data/currencies';
import AtomIcon from '@components/icons/Atom.svelte';
import BlackHoleIcon from '@components/icons/buildings/BlackHole.svelte';
import CrystalIcon from '@components/icons/buildings/Crystal.svelte';
import MicroorganismIcon from '@components/icons/buildings/Microorganism.svelte';
import MoleculeIcon from '@components/icons/buildings/Molecule.svelte';
import NanostructureIcon from '@components/icons/buildings/Nanostructure.svelte';
import NeutronStarIcon from '@components/icons/buildings/NeutronStar.svelte';
import PlanetIcon from '@components/icons/buildings/Planet.svelte';
import RockIcon from '@components/icons/buildings/Rock.svelte';
import StarIcon from '@components/icons/buildings/Star.svelte';
import DiscordIcon from '@components/icons/Discord.svelte';
import ElectronIcon from '@components/icons/Electron.svelte';
import ExcitedPhotonIcon from '@components/icons/ExcitedPhoton.svelte';
import GitHubIcon from '@components/icons/GitHub.svelte';
import HiggsBosonIcon from '@components/icons/HiggsBoson.svelte';
import PhotonIcon from '@components/icons/Photon.svelte';
import ProtonIcon from '@components/icons/Proton.svelte';
import QuarkIcon from '@components/icons/Quark.svelte';
import { Activity, ArrowBigUp, Award, Building2, Clock, Coffee, FileText, Gauge, Globe, Layers, MousePointerClick, Network, Radiation, Sparkles, TrendingUp, Trophy, Zap } from '@lucide/svelte';

/** Every icon component in the game accepts at least these two props, which is all `IconStack` needs. */
export type IconComponent = Component<{ color?: string; size?: number }>;

/**
 * Single registry of every icon that can be referenced by name (in game data, achievements, tutorials, ...)
 * instead of by import. Keeping it flat and string-keyed is what lets static data files describe an icon
 * without importing Svelte components.
 */
export const ICONS = {
	atom: AtomIcon,
	award: Award,
	blackHole: BlackHoleIcon,
	buildingLevel: Building2,
	changelog: FileText,
	click: MousePointerClick,
	coffee: Coffee,
	crystal: CrystalIcon,
	discord: DiscordIcon,
	electron: ElectronIcon,
	excitedPhoton: ExcitedPhotonIcon,
	github: GitHubIcon,
	globe: Globe,
	higgsBoson: HiggsBosonIcon,
	layers: Layers,
	level: ArrowBigUp,
	microorganism: MicroorganismIcon,
	molecule: MoleculeIcon,
	nanostructure: NanostructureIcon,
	neutronStar: NeutronStarIcon,
	offline: Clock,
	photon: PhotonIcon,
	planet: PlanetIcon,
	proton: ProtonIcon,
	quark: QuarkIcon,
	radiation: Radiation,
	rock: RockIcon,
	skillTreeMaster: Network,
	speed: Gauge,
	sparkles: Sparkles,
	stabilityMeter: Activity,
	star: StarIcon,
	trendingUp: TrendingUp,
	trophy: Trophy,
	upgrade: Zap,
} as const satisfies Record<string, IconComponent>;

export type IconName = keyof typeof ICONS;

export const BUILDING_ICON_NAMES: Record<BuildingType, IconName> = {
	[BuildingTypes.BLACK_HOLE]: 'blackHole',
	[BuildingTypes.CRYSTAL]: 'crystal',
	[BuildingTypes.MICROORGANISM]: 'microorganism',
	[BuildingTypes.MOLECULE]: 'molecule',
	[BuildingTypes.NANOSTRUCTURE]: 'nanostructure',
	[BuildingTypes.NEUTRON_STAR]: 'neutronStar',
	[BuildingTypes.PLANET]: 'planet',
	[BuildingTypes.ROCK]: 'rock',
	[BuildingTypes.STAR]: 'star',
};

export const CURRENCY_ICON_NAMES: Record<CurrencyName, IconName> = {
	[CurrenciesTypes.ATOMS]: 'atom',
	[CurrenciesTypes.ELECTRONS]: 'electron',
	[CurrenciesTypes.EXCITED_PHOTONS]: 'excitedPhoton',
	[CurrenciesTypes.HIGGS_BOSON]: 'higgsBoson',
	[CurrenciesTypes.PHOTONS]: 'photon',
	[CurrenciesTypes.PROTONS]: 'proton',
};
