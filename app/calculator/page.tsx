'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Percent,
  Info,
  Save,
  Download,
  Share2
} from 'lucide-react'

interface CalculationResult {
  equityValue: number
  donationAmount: number
  taxDeduction: number
  netBenefit: number
  capitalGains: number
  taxSavings: number
}

export default function CalculatorPage() {
  const [inputs, setInputs] = useState({
    companyValuation: '',
    equityPercentage: '',
    donationPercentage: '',
    purchasePrice: '',
    marginalTaxRate: '',
    capitalGainsTaxRate: '',
    holdingPeriod: '12', // months
  })

  const [results, setResults] = useState<CalculationResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }

  const calculateDonation = () => {
    const valuation = parseFloat(inputs.companyValuation) || 0
    const equityPercent = parseFloat(inputs.equityPercentage) || 0
    const donationPercent = parseFloat(inputs.donationPercentage) || 0
    const purchasePrice = parseFloat(inputs.purchasePrice) || 0
    const marginalRate = parseFloat(inputs.marginalTaxRate) || 0
    const capitalGainsRate = parseFloat(inputs.capitalGainsTaxRate) || 0

    const equityValue = valuation * (equityPercent / 100)
    const donationAmount = equityValue * (donationPercent / 100)
    const capitalGains = donationAmount - (purchasePrice * (donationPercent / 100))
    const taxDeduction = donationAmount * (marginalRate / 100)
    const capitalGainsTax = Math.max(0, capitalGains * (capitalGainsRate / 100))
    const taxSavings = taxDeduction - capitalGainsTax
    const netBenefit = donationAmount - capitalGainsTax

    setResults({
      equityValue,
      donationAmount,
      taxDeduction,
      netBenefit,
      capitalGains,
      taxSavings,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calculator className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Donation Calculator</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Calculate potential tax benefits and donation impact
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200">
                    <Save className="w-4 h-4" />
                    <span>Save Calculation</span>
                  </button>
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Calculation Inputs</h2>
              
              <div className="space-y-6">
                {/* Basic Inputs */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Valuation ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          value={inputs.companyValuation}
                          onChange={(e) => handleInputChange('companyValuation', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10000000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Equity Percentage (%)
                      </label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.equityPercentage}
                          onChange={(e) => handleInputChange('equityPercentage', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="5.0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Donation Percentage (%)
                      </label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.donationPercentage}
                          onChange={(e) => handleInputChange('donationPercentage', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10.0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Percentage of your equity to donate
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tax Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marginal Tax Rate (%)
                      </label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.marginalTaxRate}
                          onChange={(e) => handleInputChange('marginalTaxRate', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="37.0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Capital Gains Tax Rate (%)
                      </label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          value={inputs.capitalGainsTaxRate}
                          onChange={(e) => handleInputChange('capitalGainsTaxRate', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="20.0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Original Purchase Price ($)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            value={inputs.purchasePrice}
                            onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="100000"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          What you originally paid for this equity
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Holding Period (months)
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <select
                            value={inputs.holdingPeriod}
                            onChange={(e) => handleInputChange('holdingPeriod', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="6">6 months</option>
                            <option value="12">12 months (1 year)</option>
                            <option value="24">24 months (2 years)</option>
                            <option value="36">36 months (3+ years)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={calculateDonation}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Calculate Donation Impact
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Calculation Results</h2>
              
              {!results ? (
                <div className="text-center py-12">
                  <Calculator className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No calculations yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter your information and click calculate to see results.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Donation Value</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {formatCurrency(results.donationAmount)}
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Tax Deduction</p>
                          <p className="text-2xl font-bold text-green-900">
                            {formatCurrency(results.taxDeduction)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600">Net Tax Savings</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {formatCurrency(results.taxSavings)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Your Equity Value</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(results.equityValue)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Donation Amount</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(results.donationAmount)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Capital Gains</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(results.capitalGains)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Tax Deduction</span>
                        <span className="font-medium text-green-600">
                          -{formatCurrency(results.taxDeduction)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-900">Net Benefit</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(results.netBenefit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-4 pt-6 border-t border-gray-200">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                      Start Campaign
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200">
                      <Download className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Information Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Info className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Important Information</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>Disclaimer:</strong> This calculator provides estimates based on the information you provide. 
                    Actual tax benefits may vary based on your specific situation, changes in tax law, and other factors.
                  </p>
                  <p>
                    <strong>Consult a Professional:</strong> Please consult with a qualified tax advisor or financial 
                    professional before making any donation decisions.
                  </p>
                  <p>
                    <strong>Holding Period:</strong> Long-term capital gains rates typically apply to assets held for 
                    more than one year, while short-term gains are taxed as ordinary income.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NonprofitAdminRoute>
  )
}