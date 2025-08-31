'use client'

import { motion } from 'framer-motion'

interface AchievementCardProps {
  badge: {
    badges: {
      name: string
      description: string
      icon_url: string
      rarity: string
      xp_reward: number
    }
    earned_at: string
  }
  delay?: number
}

export function AchievementCard({ badge, delay = 0 }: AchievementCardProps) {
  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'bg-gray-100 text-gray-700 border-gray-300',
      rare: 'bg-blue-100 text-blue-700 border-blue-300',
      epic: 'bg-purple-100 text-purple-700 border-purple-300',
      legendary: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-500',
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={`p-3 rounded-lg border ${getRarityColor(badge.badges.rarity)} text-center`}
    >
      <div className="text-2xl mb-1">🏆</div>
      <h4 className="font-medium text-sm mb-1">{badge.badges.name}</h4>
      <p className="text-xs opacity-75 line-clamp-2">{badge.badges.description}</p>
      {badge.badges.xp_reward > 0 && (
        <p className="text-xs font-medium mt-1">+{badge.badges.xp_reward} XP</p>
      )}
    </motion.div>
  )
}
