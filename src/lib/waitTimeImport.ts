const CSV_NEWLINE = /\r?\n/;

export type WaitTimeDataset = {
  label: string;
  value: string;
  samples: number[];
};

export type WaitTimeDatasetResult = {
  patientCount: number;
  datasets: WaitTimeDataset[];
};

export type WaitTimeStat = {
  label: string;
  value: string;
  waitTime: number;
  sampleSize: number;
};

export type WaitTimeCalculationResult = {
  patientCount: number;
  stats: WaitTimeStat[];
  strategy: WaitTimeStrategy;
};

export interface WaitTimeStrategy {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  calculate: (dataset: WaitTimeDataset) => WaitTimeStat | null;
}

const splitCsvLine = (line: string): string[] => line.split(",").map((cell) => cell.trim());

const parseNumericCell = (cell?: string): number | null => {
  if (!cell) return null;
  const normalized = cell.replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const averageStrategy: WaitTimeStrategy = {
  id: "average",
  label: "평균",
  description: "표본의 산술 평균을 사용해 예상 대기시간을 계산합니다.",
  calculate: (dataset) => {
    if (!dataset.samples.length) {
      return null;
    }
    const sum = dataset.samples.reduce((acc, sample) => acc + sample, 0);
    return {
      label: dataset.label,
      value: dataset.value,
      waitTime: Math.round(sum / dataset.samples.length),
      sampleSize: dataset.samples.length,
    };
  },
};

export function getDefaultWaitTimeStrategy(): WaitTimeStrategy {
  return averageStrategy;
}

/**
 * Long format CSV 파서.
 *
 * 포맷:
 *   진료항목,대기시간(분)
 *   허리치료,15
 *   무릎치료,20
 *   ...
 *
 * - 헤더 2개 필요 (라벨 컬럼, 수치 컬럼)
 * - 진료항목 이름은 행 기준으로 그룹핑
 * - patientCount는 총 데이터 행 수
 */
export function parseWaitTimeCsv(csvText: string): WaitTimeDatasetResult {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error("CSV 데이터가 비어 있습니다.");
  }

  const lines = trimmed
    .split(CSV_NEWLINE)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("헤더와 최소 한 개의 데이터 행이 필요합니다.");
  }

  const headerCells = splitCsvLine(lines[0]!);
  if (headerCells.length < 2) {
    throw new Error(
      "헤더는 최소 2개 컬럼이 필요합니다. 예: '진료항목,대기시간(분)'"
    );
  }

  const datasetMap = new Map<string, WaitTimeDataset>();
  const dataLines = lines.slice(1);

  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    const label = cells[0]?.trim();
    const waitTime = parseNumericCell(cells[1]);
    if (!label || waitTime == null || waitTime < 0) continue;

    let dataset = datasetMap.get(label);
    if (!dataset) {
      dataset = { label, value: label, samples: [] };
      datasetMap.set(label, dataset);
    }
    dataset.samples.push(waitTime);
  }

  return {
    patientCount: dataLines.length,
    datasets: Array.from(datasetMap.values()),
  };
}

export function calculateWaitTimeStats(
  dataset: WaitTimeDatasetResult,
  strategy: WaitTimeStrategy = averageStrategy
): WaitTimeCalculationResult {
  const stats = dataset.datasets
    .map((entry) => strategy.calculate(entry))
    .filter((stat): stat is WaitTimeStat => Boolean(stat));

  if (!stats.length) {
    throw new Error("숫자 데이터가 없어 통계를 계산할 수 없습니다.");
  }

  return {
    patientCount: dataset.patientCount,
    stats,
    strategy,
  };
}
