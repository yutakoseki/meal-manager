import type { AppetiteLevel, FamilyMember, LifeStage } from "@/types";

export const LIFE_STAGE_OPTIONS: LifeStage[] = [
  "乳幼児",
  "小学生",
  "中学生",
  "高校生",
  "大学生",
  "20代",
  "30代",
  "40代",
  "50代",
  "60代以上",
];

export const APPETITE_OPTIONS: AppetiteLevel[] = ["小食", "普通", "大食い"];

const LIFE_STAGE_PORTION: Record<LifeStage, number> = {
  乳幼児: 0.4,
  小学生: 0.7,
  中学生: 0.9,
  高校生: 1.1,
  大学生: 1.0,
  "20代": 1.0,
  "30代": 1.0,
  "40代": 0.95,
  "50代": 0.9,
  "60代以上": 0.8,
};

const APPETITE_MULTIPLIER: Record<AppetiteLevel, number> = {
  小食: 0.85,
  普通: 1,
  大食い: 1.2,
};

export function getPortionFactor(member: Pick<FamilyMember, "lifeStage" | "appetite">): number {
  const base = LIFE_STAGE_PORTION[member.lifeStage] ?? 1;
  const multiplier = APPETITE_MULTIPLIER[member.appetite] ?? 1;
  return Number((base * multiplier).toFixed(2));
}
