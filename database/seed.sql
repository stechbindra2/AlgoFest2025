-- FinQuest Seed Data
-- Demo-ready dataset for offline showcase

-- Insert grades
INSERT INTO grades (id, grade_number, name, description) VALUES
(uuid_generate_v4(), 3, 'Grade 3', 'Basic money concepts and counting'),
(uuid_generate_v4(), 4, 'Grade 4', 'Needs vs wants and simple budgeting'),
(uuid_generate_v4(), 5, 'Grade 5', 'Saving strategies and goal setting'),
(uuid_generate_v4(), 6, 'Grade 6', 'Banking basics and money management'),
(uuid_generate_v4(), 7, 'Grade 7', 'Introduction to investing and entrepreneurship');

-- Store grade IDs for reference
DO $$
DECLARE
    grade3_id UUID;
    grade7_id UUID;
    topic_id UUID;
    question_id UUID;
BEGIN
    -- Get grade IDs
    SELECT id INTO grade3_id FROM grades WHERE grade_number = 3;
    SELECT id INTO grade7_id FROM grades WHERE grade_number = 7;

    -- Insert topics for Grade 3
    INSERT INTO topics (id, grade_id, name, description, sequence_order, learning_objectives, estimated_duration_minutes, difficulty_base, icon_name, color_theme) VALUES
    (uuid_generate_v4(), grade3_id, 'What is Money?', 'Understanding what money is and why we use it', 1, ARRAY['Identify different types of money', 'Understand the purpose of money'], 15, 0.2, 'coins', 'blue'),
    (uuid_generate_v4(), grade3_id, 'Counting Money', 'Learning to count coins and bills', 2, ARRAY['Count different coins', 'Add money amounts'], 20, 0.3, 'calculator', 'green'),
    (uuid_generate_v4(), grade3_id, 'Earning Money', 'How people earn money through work', 3, ARRAY['Understand how people earn money', 'Identify different jobs'], 18, 0.25, 'briefcase', 'orange'),
    (uuid_generate_v4(), grade3_id, 'Spending Money', 'Making choices about what to buy', 4, ARRAY['Make spending decisions', 'Compare prices'], 22, 0.35, 'shopping-cart', 'purple'),
    (uuid_generate_v4(), grade3_id, 'Saving Money', 'Why and how to save money', 5, ARRAY['Understand importance of saving', 'Set simple savings goals'], 25, 0.4, 'piggy-bank', 'pink');

    -- Insert topics for Grade 7
    INSERT INTO topics (id, grade_id, name, description, sequence_order, learning_objectives, estimated_duration_minutes, difficulty_base, icon_name, color_theme) VALUES
    (uuid_generate_v4(), grade7_id, 'Advanced Budgeting', 'Creating and managing detailed budgets', 1, ARRAY['Create monthly budgets', 'Track expenses', 'Adjust spending plans'], 30, 0.6, 'chart-bar', 'blue'),
    (uuid_generate_v4(), grade7_id, 'Banking Basics', 'Understanding bank accounts and services', 2, ARRAY['Compare account types', 'Understand interest', 'Use online banking'], 35, 0.65, 'building-2', 'green'),
    (uuid_generate_v4(), grade7_id, 'Introduction to Investing', 'Basic investment concepts', 3, ARRAY['Understand risk vs return', 'Learn about stocks and bonds'], 40, 0.75, 'trending-up', 'orange'),
    (uuid_generate_v4(), grade7_id, 'Entrepreneurship Basics', 'Starting a small business', 4, ARRAY['Develop business ideas', 'Understand profit and loss'], 45, 0.8, 'lightbulb', 'purple'),
    (uuid_generate_v4(), grade7_id, 'Financial Planning', 'Long-term financial goals', 5, ARRAY['Set financial goals', 'Create savings plans'], 50, 0.85, 'target', 'pink');

    -- Insert sample questions for "What is Money?" topic (Grade 3)
    SELECT id INTO topic_id FROM topics WHERE name = 'What is Money?' AND grade_id = grade3_id;
    
    INSERT INTO questions (topic_id, question_type, difficulty_level, question_text, question_data, explanation, learning_objective, estimated_time_seconds) VALUES
    (topic_id, 'multiple_choice', 0.2, 'What do we use money for?', 
     '{"type": "multiple_choice", "options": ["To buy things we need", "To play games", "To make noise", "To throw away"], "correct_answer": "To buy things we need"}',
     'Money is used to buy things we need and want, like food, clothes, and toys.', 'Understand the purpose of money', 30),
    
    (topic_id, 'multiple_choice', 0.25, 'Which of these is money?', 
     '{"type": "multiple_choice", "options": ["Leaves", "Coins", "Rocks", "Sticks"], "correct_answer": "Coins"}',
     'Coins are a type of money. They are made of metal and have different values.', 'Identify different types of money', 25),
     
    (topic_id, 'story_based', 0.3, 'Emma wants to buy a toy that costs $5. She has 2 dollars. What should Emma do?', 
     '{"type": "multiple_choice", "options": ["Take the toy anyway", "Save more money until she has $5", "Ask someone else to buy it", "Cry"], "correct_answer": "Save more money until she has $5"}',
     'When we don''t have enough money for something, we should save more money until we can afford it.', 'Understand spending decisions', 40);

    -- Insert sample questions for "Advanced Budgeting" topic (Grade 7)
    SELECT id INTO topic_id FROM topics WHERE name = 'Advanced Budgeting' AND grade_id = grade7_id;
    
    INSERT INTO questions (topic_id, question_type, difficulty_level, question_text, question_data, explanation, learning_objective, estimated_time_seconds) VALUES
    (topic_id, 'scenario', 0.6, 'You earn $100 per month from babysitting. Your expenses are: Phone bill $25, Snacks $15, Savings goal $30, Entertainment $20. How much money do you have left?', 
     '{"type": "multiple_choice", "options": ["$5", "$10", "$15", "$20"], "correct_answer": "$10"}',
     'Total expenses: $25 + $15 + $30 + $20 = $90. Money left: $100 - $90 = $10.', 'Calculate budget surplus/deficit', 60),
     
    (topic_id, 'drag_drop', 0.65, 'Categorize these expenses as Fixed or Variable:', 
     '{"type": "drag_drop", "items": ["Rent", "Groceries", "Phone bill", "Entertainment", "Insurance"], "categories": ["Fixed", "Variable"], "correct_answer": {"Fixed": ["Rent", "Phone bill", "Insurance"], "Variable": ["Groceries", "Entertainment"]}}',
     'Fixed expenses stay the same each month, while variable expenses can change.', 'Distinguish between fixed and variable expenses', 90);

END $$;

-- Insert sample badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria, xp_reward, rarity) VALUES
('First Steps', 'Complete your first question!', '/badges/first-steps.svg', 'achievement', '{"questions_answered": 1}', 50, 'common'),
('Quick Learner', 'Answer 5 questions correctly in under 20 seconds each', '/badges/quick-learner.svg', 'achievement', '{"quick_correct_answers": 5}', 150, 'rare'),
('Streak Master', 'Maintain a 7-day learning streak', '/badges/streak-master.svg', 'streak', '{"streak_days": 7}', 200, 'rare'),
('Money Expert', 'Achieve 90% mastery in any topic', '/badges/money-expert.svg', 'mastery', '{"topic_mastery": 0.9}', 300, 'epic'),
('Perfectionist', 'Answer 10 questions in a row correctly', '/badges/perfectionist.svg', 'achievement', '{"consecutive_correct": 10}', 250, 'epic'),
('Legend', 'Reach level 10', '/badges/legend.svg', 'achievement', '{"level_reached": 10}', 500, 'legendary');

-- Create sample leaderboards
INSERT INTO leaderboards (type, timeframe) VALUES
('global', 'all_time'),
('global', 'weekly'),
('grade', 'all_time'),
('grade', 'monthly');

END;
