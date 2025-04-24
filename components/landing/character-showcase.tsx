import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function CharacterShowcase() {
  return (
    <div className="container mx-auto px-4 py-16 bg-gray-900">
      <h2 className="text-3xl font-bold text-center mb-12 text-cyan-400">Meet the Warriors</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <CharacterCard
          name="Temporal Knight"
          type="Chrono"
          image="/images/knight.jpeg"
          description="A steadfast guardian of the timeline, wielding a chrono-blade that cuts through temporal distortions."
        />
        <CharacterCard
          name="Rift Assassin"
          type="Rift"
          image="/images/assassin.jpeg"
          description="A swift striker who moves between timeline fractures, appearing where least expected."
        />
        <CharacterCard
          name="Future Seer"
          type="Future"
          image="/images/future.jpeg"
          description="A mysterious entity who glimpses possible futures to anticipate and counter enemy moves."
        />
        <CharacterCard
          name="Ancient Guardian"
          type="Past"
          image="/images/guardian.jpeg"
          description="A powerful defender who draws strength from historical echoes, bolstering allies with forgotten knowledge."
        />
      </div>
    </div>
  )
}

function CharacterCard({
  name,
  type,
  image,
  description,
}: {
  name: string
  type: string
  image: string
  description: string
}) {
  const typeColors: Record<string, string> = {
    Chrono: "bg-cyan-600",
    Rift: "bg-purple-600",
    Future: "bg-emerald-600",
    Past: "bg-amber-600",
  }

  return (
    <Card className="overflow-hidden bg-gray-800 border-gray-700 transition-transform hover:scale-105">
      <div className="relative h-64 w-full">
        <Image src={image || "/placeholder.svg"} alt={name} fill className="object-cover" />
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-white">{name}</h3>
          <Badge className={typeColors[type] || "bg-gray-600"}>{type}</Badge>
        </div>
        <p className="text-gray-300 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}
