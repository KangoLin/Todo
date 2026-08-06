#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Reward {
    pub strength_exp: i32,
    pub agility_exp: i32,
    pub focus_exp: i32,
    pub endurance_exp: i32,
    pub gold: i32,
}

/// 完成一个时间块的结算。
/// planned_minutes: 计划时长；actual_minutes: 实际专注时长（0 表示未记录）。
/// 规则：基础 +10 力量 +10 金币；
/// 实际 ≤ 计划（且计划 > 0）→ +5 敏捷；
/// 实际 > 计划 → 延长部分（封顶计划 50%）每整 15 分钟 +2 专注。
pub fn settle_completion(planned_minutes: i32, actual_minutes: i32) -> Reward {
    let mut r = Reward { strength_exp: 10, gold: 10, ..Default::default() };
    if planned_minutes <= 0 {
        return r;
    }
    if actual_minutes <= 0 || actual_minutes <= planned_minutes {
        r.agility_exp = 5;
    } else {
        let cap = (planned_minutes as f64 * 0.5) as i32;
        let extra = (actual_minutes - planned_minutes).min(cap);
        r.focus_exp = extra / 15 * 2;
    }
    r
}

/// 饱食度按小时自然消耗（每小时 -1，下限 0）。
pub fn satiety_tick(satiety: i32, hours: i64) -> i32 {
    (satiety - (hours as i32).min(10000)).max(0)
}

/// 战力公式：等级×20 + 力量×2 + 敏捷×1.5 + 专注×1.5 + 韧性×2
pub fn power(level: i32, strength: i32, agility: i32, focus: i32, endurance: i32) -> i32 {
    level * 20
        + strength * 2
        + ((agility as f64 * 1.5) as i32)
        + ((focus as f64 * 1.5) as i32)
        + endurance * 2
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn completion_on_time_gives_agility() {
        let r = settle_completion(120, 100);
        assert_eq!(r.strength_exp, 10);
        assert_eq!(r.agility_exp, 5);
        assert_eq!(r.gold, 10);
    }

    #[test]
    fn completion_extended_gives_focus_capped() {
        // 计划60分钟实际180：延长120分钟，封顶30（60×50%）→ 30/15×2 = 4
        let r = settle_completion(60, 180);
        assert_eq!(r.agility_exp, 0);
        assert_eq!(r.focus_exp, 4);
        // 无专注数据（actual=0）→ 按按时完成处理
        let r2 = settle_completion(60, 0);
        assert_eq!(r2.agility_exp, 5);
        // 无计划时间 → 只有基础奖励
        let r3 = settle_completion(0, 0);
        assert_eq!(r3.strength_exp, 10);
        assert_eq!(r3.gold, 10);
        assert_eq!(r3.agility_exp, 0);
    }

    #[test]
    fn satiety_decreases_and_caps_at_zero() {
        assert_eq!(satiety_tick(50, 10), 40);
        assert_eq!(satiety_tick(50, 100), 0);
        assert_eq!(satiety_tick(50, 1000), 0);
    }

    #[test]
    fn power_formula() {
        // 12*20 + 10*2 + 4*1.5 + 6*1.5 + 8*2 = 240+20+6+9+16 = 291
        assert_eq!(power(12, 10, 4, 6, 8), 291);
    }
}