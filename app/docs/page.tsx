import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8">
          <Link href="/" className="text-cyan-400 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2 text-white">ChronoClash Documentation</h1>
          <p className="text-gray-300">Learn how to play, deploy, and customize your ChronoClash game.</p>
        </div>

        <Tabs defaultValue="gameplay">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="gameplay">Gameplay</TabsTrigger>
            <TabsTrigger value="arweave">Arweave & AO</TabsTrigger>
            <TabsTrigger value="deployment">Deployment</TabsTrigger>
            <TabsTrigger value="customization">Customization</TabsTrigger>
          </TabsList>

          <TabsContent value="gameplay" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Game Rules</CardTitle>
                <CardDescription className="text-gray-300">Learn the basic rules of ChronoClash.</CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Overview</h3>
                <p>
                  ChronoClash is a turn-based 1v1 PvP strategy game where players battle using character cards themed
                  around time-warped warriors. Each player receives the same 4 character cards per match.
                </p>

                <h3 className="text-xl font-semibold text-white">Turn-Based Combat</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Players take turns playing one of their 4 cards.</li>
                  <li>Each card has a normal attack and a special attack.</li>
                  <li>Special attacks become available after using a card 3 times.</li>
                  <li>Cards have cooldown periods after being used.</li>
                  <li>Players must balance offense, defense, and card cycling to outmaneuver their opponent.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white">Win Conditions</h3>
                <p>
                  A player wins when they defeat all 4 of their opponent's character cards. On victory, the winner
                  claims the full prize pool (total wagered amount).
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Card Types</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn about the different card types and their advantages.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-700 rounded-md">
                    <h4 className="font-semibold text-cyan-400">Chrono</h4>
                    <p>Balanced warriors with moderate HP and attack power. Effective against Rift types.</p>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-md">
                    <h4 className="font-semibold text-purple-400">Rift</h4>
                    <p>High attack, low HP warriors that excel at dealing damage quickly.</p>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-md">
                    <h4 className="font-semibold text-emerald-400">Future</h4>
                    <p>Moderate stats with special abilities. Effective against Past types.</p>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-md">
                    <h4 className="font-semibold text-amber-400">Past</h4>
                    <p>High HP, low attack warriors that excel at surviving longer battles.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="arweave" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Arweave Integration</CardTitle>
                <CardDescription className="text-gray-300">
                  Understanding how ChronoClash uses Arweave for permanent storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">What is Arweave?</h3>
                <p>
                  Arweave is a decentralized storage network that allows you to store data permanently. In ChronoClash,
                  all game states, match results, and player histories are stored on Arweave, making them immutable and
                  permanently accessible.
                </p>

                <h3 className="text-xl font-semibold text-white">AO Protocol</h3>
                <p>
                  AO is a computation protocol built on Arweave that ChronoClash uses for game logic execution. Instead
                  of traditional SmartWeave contracts, ChronoClash uses AO processes which provide:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Greater efficiency and performance</li>
                  <li>Better real-time capabilities for turn-based mechanics</li>
                  <li>Native support for Lua (the language used for game logic)</li>
                </ul>

                <h3 className="text-xl font-semibold text-white">How Game State is Stored</h3>
                <p>
                  Each match in ChronoClash is represented as an individual AO process. The process maintains the
                  complete game state including current player turn, card states, move history, and wager amounts.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Testnet vs Mainnet</CardTitle>
                <CardDescription className="text-gray-300">
                  Understanding the different networks for development and production.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Testnet</h3>
                <p>
                  The testnet is a development environment where you can test your game without using real AR tokens.
                  It's perfect for development and testing as transactions are free and confirmations are faster.
                </p>
                <p>To use testnet:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Set <code className="bg-gray-700 px-1 rounded">NEXT_PUBLIC_NETWORK=testnet</code> in your .env file
                  </li>
                  <li>Use the testnet faucet to get test AR tokens</li>
                  <li>Connect your ARConnect wallet to the testnet network</li>
                </ul>

                <h3 className="text-xl font-semibold text-white">Mainnet</h3>
                <p>
                  The mainnet is the production environment where real AR tokens are used. When you're ready to launch
                  your game, you'll deploy to mainnet.
                </p>
                <p>To use mainnet:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Set <code className="bg-gray-700 px-1 rounded">NEXT_PUBLIC_NETWORK=mainnet</code> in your .env file
                  </li>
                  <li>Ensure you have real AR tokens in your wallet</li>
                  <li>Connect your ARConnect wallet to the mainnet network</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Deploying the AO Process</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn how to deploy your game logic to Arweave.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Prerequisites</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>ARConnect wallet installed and configured</li>
                  <li>AR tokens for transaction fees (or testnet tokens for testnet)</li>
                  <li>Your Lua game logic code</li>
                </ul>

                <h3 className="text-xl font-semibold text-white">Deployment Steps</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Navigate to the Deploy page in the ChronoClash app</li>
                  <li>Connect your ARConnect wallet</li>
                  <li>Paste your Lua code or upload a .lua file</li>
                  <li>Click "Deploy to Arweave"</li>
                  <li>Confirm the transaction in your wallet</li>
                  <li>Wait for the deployment to complete</li>
                  <li>Save the Process ID for future reference</li>
                </ol>

                <h3 className="text-xl font-semibold text-white">Environment Variables</h3>
                <p>After deployment, update your .env file with the following variables:</p>
                <pre className="bg-gray-700 p-4 rounded-md overflow-x-auto">
                  {`NEXT_PUBLIC_AO_PROCESS_ID=your_process_id
NEXT_PUBLIC_AO_MODULE_ID=your_module_id
NEXT_PUBLIC_AO_SCHEDULER=your_scheduler_id`}
                </pre>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Deploying the Frontend</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn how to deploy your ChronoClash frontend.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Deploying to Vercel</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Push your code to a GitHub repository</li>
                  <li>Create a new project on Vercel</li>
                  <li>Connect your GitHub repository</li>
                  <li>Add your environment variables in the Vercel dashboard</li>
                  <li>Deploy your project</li>
                </ol>

                <h3 className="text-xl font-semibold text-white">Other Hosting Options</h3>
                <p>You can also deploy your ChronoClash frontend to other hosting providers like:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Netlify</li>
                  <li>AWS Amplify</li>
                  <li>GitHub Pages</li>
                </ul>
                <p>Just make sure to set up your environment variables correctly on your chosen platform.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customization" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Customizing Cards</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn how to customize the cards in your ChronoClash game.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Modifying Card Stats</h3>
                <p>
                  To modify card stats, edit the <code className="bg-gray-700 px-1 rounded">lib/cards.ts</code> file:
                </p>
                <pre className="bg-gray-700 p-4 rounded-md overflow-x-auto">
                  {`export const generateCardPool = (): Card[] => {
  return [
    {
      id: 1,
      name: "Your Custom Card",
      type: "Chrono",
      hp: 30,  // Modify HP
      maxHp: 30,
      attackPower: 10,  // Modify attack power
      specialAttackPower: 20,  // Modify special attack power
      usageCount: 0,
      cooldown: 0,
      maxCooldown: 3,  // Modify cooldown time
      defeated: false,
      image: "/images/your-image.png",  // Add custom image
      description: "Your custom card description."
    },
    // Add more cards...
  ];
};`}
                </pre>

                <h3 className="text-xl font-semibold text-white">Adding New Card Types</h3>
                <p>
                  To add new card types, update the <code className="bg-gray-700 px-1 rounded">lib/types.ts</code> file:
                </p>
                <pre className="bg-gray-700 p-4 rounded-md overflow-x-auto">
                  {`export type CardType = "Chrono" | "Rift" | "Future" | "Past" | "YourNewType";`}
                </pre>
                <p>
                  Then update the <code className="bg-gray-700 px-1 rounded">getTypeColor</code> function in{" "}
                  <code className="bg-gray-700 px-1 rounded">lib/cards.ts</code>:
                </p>
                <pre className="bg-gray-700 p-4 rounded-md overflow-x-auto">
                  {`export const getTypeColor = (type: CardType): string => {
  const colors: Record<CardType, string> = {
    Chrono: "cyan",
    Rift: "purple",
    Future: "emerald",
    Past: "amber",
    YourNewType: "pink"  // Add your new type color
  };
  
  return colors[type] || "gray";
};`}
                </pre>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Customizing Game Logic</CardTitle>
                <CardDescription className="text-gray-300">
                  Learn how to customize the game logic in your ChronoClash game.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-gray-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Modifying Lua Code</h3>
                <p>The game logic is implemented in Lua and deployed as an AO process. To modify the game logic:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>
                    Edit the <code className="bg-gray-700 px-1 rounded">ao-process/chronoclash.lua</code> file
                  </li>
                  <li>Deploy the updated Lua code using the Deploy page</li>
                  <li>Update your environment variables with the new process ID</li>
                </ol>

                <h3 className="text-xl font-semibold text-white">Adding New Game Mechanics</h3>
                <p>Here are some ideas for new game mechanics you can implement:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Card abilities (e.g., healing, shielding, status effects)</li>
                  <li>Combo systems for playing cards in specific sequences</li>
                  <li>Resource management (e.g., mana, energy)</li>
                  <li>Card drafting phase before the match</li>
                </ul>
                <p>To implement these, you'll need to modify both the Lua game logic and the frontend components.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
