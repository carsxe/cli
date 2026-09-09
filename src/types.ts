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
  recallsYmm(
    key: string,
    year: string,
    make: string,
    model: string,
  ): Promise<unknown>;
  recallsBatchSubmit(
    key: string,
    body: {
      vins?: string[];
      csv?: string;
      csvUrl?: string;
      webhookUrl?: string;
    },
  ): Promise<unknown>;
  recallsBatchStatus(key: string, batchId: string): Promise<unknown>;
  recallsBatchResults(key: string, batchId: string): Promise<unknown>;
  recallsBatchDownload(key: string, batchId: string): Promise<string>;
  ymmOptions(
    key: string,
    dimension?: string,
    year?: string,
    make?: string,
    model?: string,
    trim?: string,
  ): Promise<unknown>;
  ownershipVin(key: string, vin: string, include?: string): Promise<unknown>;
  ownershipPerson(
    key: string,
    firstName: string,
    lastName: string,
    address: string,
    zip: string,
    include?: string,
  ): Promise<unknown>;
  ownershipAddress(
    key: string,
    address: string,
    zip: string,
    include?: string,
    variant?: string,
  ): Promise<unknown>;
  ownershipZip(
    key: string,
    zip: string,
    gender?: string,
    minAge?: string,
    maxAge?: string,
    income?: string,
    page?: string,
    limit?: string,
    include?: string,
    variant?: string,
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
};
