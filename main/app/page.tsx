import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            🎲 WhipHash Randomness
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Pyth Entropy Randomness Generator on Base Sepolia
          </p>
          
          <div className="bg-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Contract Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-300">Contract Address:</p>
                <p className="text-white font-mono break-all">0xE861DC68Eb976da0661035bBf132d6F3a3288B71</p>
              </div>
              <div>
                <p className="text-gray-300">Network:</p>
                <p className="text-white">Base Sepolia</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href="/test"
              className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-medium transition-all transform hover:scale-105 text-lg"
            >
              🚀 Test RandomnessGen Contract
            </Link>
            
            <div className="text-gray-300 text-sm">
              <p>Features:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Request two random numbers from Pyth Entropy</li>
                <li>Multiple format conversions (hex, percentage, range, decimal)</li>
                <li>Wallet integration with RainbowKit</li>
                <li>Real-time transaction monitoring</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
