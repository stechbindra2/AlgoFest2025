-- FinQuest Database Schema
-- Optimized for performance with proper indexing and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with role-based access
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- User profiles with gamification data
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    preferred_learning_style VARCHAR(50),
    accessibility_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Curriculum structure
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,
    learning_objectives TEXT[],
    estimated_duration_minutes INTEGER,
    difficulty_base DECIMAL(3,2) DEFAULT 0.5,
    icon_name VARCHAR(50),
    color_theme VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Questions with contextual metadata
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL CHECK (
        question_type IN ('multiple_choice', 'drag_drop', 'scenario', 'story_based', 'mini_game')
    ),
    difficulty_level DECIMAL(3,2) NOT NULL CHECK (difficulty_level BETWEEN 0.0 AND 1.0),
    question_text TEXT NOT NULL,
    question_data JSONB NOT NULL, -- Stores options, correct answers, media URLs
    explanation TEXT,
    learning_objective VARCHAR(200),
    estimated_time_seconds INTEGER DEFAULT 30,
    cognitive_load DECIMAL(3,2) DEFAULT 0.5,
    engagement_factor DECIMAL(3,2) DEFAULT 0.5,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User progress tracking with mastery model
CREATE TABLE user_topic_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    mastery_score DECIMAL(5,4) DEFAULT 0.0 CHECK (mastery_score BETWEEN 0.0 AND 1.0),
    attempts_count INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    mastery_achieved_at TIMESTAMP,
    confidence_interval DECIMAL(5,4) DEFAULT 0.0,
    learning_rate DECIMAL(5,4) DEFAULT 0.1,
    forgetting_rate DECIMAL(5,4) DEFAULT 0.05,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Individual question attempts for detailed analytics
CREATE TABLE question_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER NOT NULL,
    answer_data JSONB NOT NULL,
    hint_used BOOLEAN DEFAULT false,
    attempt_number INTEGER DEFAULT 1,
    confidence_rating INTEGER CHECK (confidence_rating BETWEEN 1 AND 5),
    engagement_signals JSONB DEFAULT '{}', -- mouse movements, pauses, etc.
    contextual_factors JSONB DEFAULT '{}', -- time of day, session length, etc.
    bandit_context JSONB DEFAULT '{}', -- context used by bandit algorithm
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gamification: Badges system
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_type VARCHAR(50) NOT NULL CHECK (
        badge_type IN ('achievement', 'streak', 'mastery', 'special')
    ),
    criteria JSONB NOT NULL, -- Conditions to earn the badge
    xp_reward INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (
        rarity IN ('common', 'rare', 'epic', 'legendary')
    ),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    UNIQUE(user_id, badge_id)
);

-- Learning sessions for analytics
CREATE TABLE learning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    topics_covered UUID[],
    session_quality_score DECIMAL(3,2),
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
    adaptive_adjustments JSONB DEFAULT '{}' -- Track bandit decisions
);

-- Contextual bandit model state
CREATE TABLE bandit_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    model_type VARCHAR(50) DEFAULT 'thompson_sampling',
    context_features JSONB NOT NULL,
    arm_parameters JSONB NOT NULL, -- Beta parameters for Thompson Sampling
    exploration_rate DECIMAL(5,4) DEFAULT 0.1,
    total_interactions INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    model_version INTEGER DEFAULT 1,
    UNIQUE(user_id, model_type)
);

-- Teacher-student relationships for classroom management
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    grade_id UUID REFERENCES grades(id),
    class_code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE classroom_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(classroom_id, student_id)
);

-- Leaderboards
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('global', 'classroom', 'grade', 'weekly')),
    scope_id UUID, -- classroom_id or grade_id
    timeframe VARCHAR(20) DEFAULT 'all_time' CHECK (
        timeframe IN ('daily', 'weekly', 'monthly', 'all_time')
    ),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rank_position INTEGER NOT NULL,
    score INTEGER NOT NULL,
    metric_type VARCHAR(50) DEFAULT 'total_xp',
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(leaderboard_id, user_id)
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_grade ON users(role, grade);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_questions_topic_difficulty ON questions(topic_id, difficulty_level);
CREATE INDEX idx_question_attempts_user_question ON question_attempts(user_id, question_id);
CREATE INDEX idx_question_attempts_created_at ON question_attempts(created_at);
CREATE INDEX idx_user_topic_mastery_user_topic ON user_topic_mastery(user_id, topic_id);
CREATE INDEX idx_learning_sessions_user_started ON learning_sessions(user_id, started_at);
CREATE INDEX idx_bandit_models_user_type ON bandit_models(user_id, model_type);
CREATE INDEX idx_classroom_students_classroom ON classroom_students(classroom_id);
CREATE INDEX idx_leaderboard_entries_board_rank ON leaderboard_entries(leaderboard_id, rank_position);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_topic_mastery_updated_at BEFORE UPDATE ON user_topic_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
