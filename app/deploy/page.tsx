"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnectWallet } from "@/components/wallet/connect-wallet"
import { Loader2, Check, ArrowLeft } from "lucide-react"
import { deployAoProcess, updateEnvironmentVariables } from "@/lib/ao-deploy"
import { arweaveWallet } from "@/lib/wallet"
import { useRouter } from "next/navigation"

export default function DeployPage() {
  const router = useRouter()
  const [luaCode, setLuaCode] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedProcessId, setDeployedProcessId] = useState<string | null>(null)
  const [step, setStep] = useState<"code" | "deploy" | "complete">("code")
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleDeploy = async () => {
    if (!arweaveWallet.isConnected()) {
      alert("Please connect your wallet first")
      return
    }

    if (!luaCode.trim()) {
      alert("Please enter the Lua code")
      return
    }

    setIsDeploying(true)
    setStep("deploy")
    setError(null)

    try {
      const processId = await deployAoProcess(luaCode)
      setDeployedProcessId(processId)
      await updateEnvironmentVariables(processId)
      setStep("complete")
    } catch (error) {
      console.error("Error deploying AO process:", error)
      setError(`Failed to deploy AO process: ${error}`)
      setStep("code")
    } finally {
      setIsDeploying(false)
    }
  }

  const handleRetry = async () => {
    setRetryCount(retryCount + 1)
    // Implement exponential backoff
    const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000)
    await new Promise((resolve) => setTimeout(resolve, backoffTime))
    handleDeploy()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setLuaCode(content)
    }
    reader.onerror = (e) => {
      console.error("FileReader error:", e)
    }
    reader.readAsText(file)
  }

  const goToHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={goToHome} className="text-gray-300">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Button>
            <ConnectWallet />
          </div>
          <CardTitle className="text-2xl text-white mt-4">Deploy AO Process</CardTitle>
          <CardDescription className="text-gray-300">
            Deploy your ChronoClash game logic to Arweave using AO.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "code" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="luaCode" className="text-white">
                  Lua Code
                </Label>
                <Textarea
                  id="luaCode"
                  value={luaCode}
                  onChange={(e) => setLuaCode(e.target.value)}
                  placeholder="Paste your Lua code here..."
                  className="h-64 bg-gray-700 border-gray-600 text-white font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="luaFile" className="text-white">
                  Or Upload Lua File
                </Label>
                <Input
                  id="luaFile"
                  type="file"
                  accept=".lua"
                  onChange={handleFileUpload}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-sm">
                  {error}
                  <Button variant="link" className="text-red-300 p-0 h-auto text-sm ml-2" onClick={handleRetry}>
                    Retry
                  </Button>
                </div>
              )}
            </>
          )}

          {step === "deploy" && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-cyan-500" />
              <h3 className="text-xl font-semibold text-white mb-2">Deploying to Arweave</h3>
              <p className="text-gray-300">
                Your AO process is being deployed to the Arweave network. This may take a few minutes.
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Deployment Complete!</h3>
              <p className="text-gray-300 mb-4">Your AO process has been successfully deployed to Arweave.</p>
              <div className="p-4 bg-gray-700 rounded-md text-left">
                <div className="text-sm text-gray-400 mb-1">Process ID</div>
                <div className="font-mono text-cyan-400 break-all">{deployedProcessId}</div>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                This process ID has been saved to your environment variables.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {step === "code" && (
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !arweaveWallet.isConnected() || !luaCode.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              Deploy to Arweave
            </Button>
          )}

          {step === "complete" && (
            <Button onClick={goToHome} className="w-full bg-cyan-600 hover:bg-cyan-700">
              Return to Home
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
