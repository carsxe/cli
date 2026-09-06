export type APITypes = {
  specs(
    key: string,
    vin: string,
    deepdata?: string,
    disableIntVINDecoding?: string,
  ): Promise<unknown>;
  marketValue(
    key: string,
    vin: string,
    mileage?: string,
    state?: string,
    condition?: string,
    country?: string,
  ): Promise<unknown>;
  history(key: string, vin: string): Promise<unknown>;
  recalls(key: string, vin: string): Promise<unknown>;
  internationalVin(key: string, vin: string): Promise<unknown>;
  plateDecoder(
    key: string,
    plate: string,
    country: string,
    state?: string,
    district?: string,
  ): Promise<unknown>;
  lienTheft(key: string, vin: string): Promise<unknown>;
  plateImage(key: string, imageUrl: string): Promise<unknown>;
  vinOcr(key: string, imageUrl: string): Promise<unknown>;
  ymm(
    key: string,
    year: string,
    make: string,
    model: string,
    trim?: string,
  ): Promise<unknown>;
  images(
    key: string,
    make: string,
    model: string,
    year?: string,
    trim?: string,
    color?: string,
    angle?: string,
    photoType?: string,
    size?: string,
  ): Promise<unknown>;
  obd(key: string, code: string): Promise<unknown>;
  listMonitors(key: string): Promise<unknown>;
  getMonitor(key: string, id: string): Promise<unknown>;
  createMonitor(key: string, body: unknown): Promise<unknown>;
  updateMonitor(key: string, id: string, body: unknown): Promise<unknown>;
  deleteMonitor(key: string, id: string): Promise<unknown>;
  importMonitorVehicles(key: string, id: string, body: unknown): Promise<unknown>;
  runMonitor(key: string, id: string): Promise<unknown>;
  listMonitorAlerts(key: string, id?: string): Promise<unknown>;
};
