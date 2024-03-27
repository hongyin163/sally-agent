import { IChatBody, IChatResult, ICompletionsBody } from "chat-list/types/chat";
import { IUserOrderState } from "chat-list/types/license";
export type ColumnType = 'string' | 'number' | 'boolean';

export interface DataValidationColConfig {
    col: number,
    type: ColumnType,
    options: (string | number | boolean)[],
}

export interface ITableOption {
    headerRowColor?: string,
    headerFontColor?: string,
    firstRowColor?: string,
    secondRowColor?: string,
    footerRowColor?: string,
    borderColor?: string,
    rowFontColor?: string,
    theme?: string;
    active?: boolean;
}

export interface ISheetService {
    initSheet: (name?: string, titles?: string[], options?: ITableOption) => Promise<string>;
    formatTable: (options?: ITableOption) => Promise<void>;
    AddChart: (
        type: string,
        title: string,
        xAxisTitle: string,
        yAxisTitle: string,
        yAxisTitles: string[],
        isStacked?: 'false' | 'true',
        position?: number[]
    ) => Promise<string>;
    setDataValidationAfterRow: (row: number, colConfigs: DataValidationColConfig[], urls: string[]) => Promise<void>
    translateText: (text: string, sourceLanguage: string, targetLanguage: string) => Promise<string>;
    setFormula: (formula: string) => void;
    transposeTable: () => Promise<void>;
    getValues: (limit?: number, sheetName?: string, sheetNumber?: number) => Promise<string>;
    setValues: (values: string[][], sheetName?: string) => Promise<void>;
    insertImage: (dataUrl: string, width?: number, height?: number) => Promise<void>;
    getRowColNum: () => Promise<{ row: number; col: number; rowNum: number, colNum: number }>;
    getRangeA1Notation: () => Promise<string>;
    showModalDialog: (file: string, title: string, width?: number, height?: number, callback?: (args: any) => void) => Promise<void>;
    insertTable: (value: string[][], options: ITableOption) => Promise<void>;
    appendRows: (value: string[][]) => Promise<void>;
    insertText: (value: string) => Promise<void>;
    highlightRowsWithColor: (rows: number[], color: string) => Promise<void>;
    clearHighlightRows: () => Promise<void>;
    registSelectEvent?: (callback: (values: string[][]) => void) => Promise<void>;
    runScript: (code: string) => Promise<any>;
    getSheetInfo: () => Promise<{ current: string, sheets: string[] }>;
    getValuesByRange: (rowOrA1Notation: number | string, column?: number, numRows?: number, numColumns?: number) => Promise<string>;
    setValuesByRange: (values: string[][], rowOrA1Notation: number | string, column?: number, numRows?: number, numColumns?: number) => Promise<void>;
}


export interface IRange {
    row: number;
    col: number;
    rowNum: number;
    colNum: number;
}
export interface IExcelService {
    addSheet: (name: string, titles: string[], options?: ITableOption) => Promise<void>;
    formatTable: (options?: ITableOption) => Promise<void>;
    getRange: (range: string) => Promise<IRange>;
    getValues: (limit?: number) => Promise<string>;
    setValues: (values: string[][]) => Promise<void>;
    setFormula: (formula: string) => void;
    AddChart: (
        type: string,
        title: string,
        xAxisTitle: string,
        yAxisTitle: string,
        yAxisTitles: string[],
        isStacked: 'false' | 'true'
    ) => Promise<void>;
    insertImage: (dataUrl: string, width?: number, height?: number) => Promise<void>;
    setDataValidationAfterRow: (row: number, colConfigs: DataValidationColConfig[], urls: string[]) => Promise<void>
    showModalDialog: (file: string, title: string, width?: number, height?: number, callback?: (args: any) => void) => Promise<void>;

    transposeTable: () => Promise<void>;
    insertTable: (value: string[][], options: ITableOption) => Promise<void>;
    appendRows: (value: string[][]) => Promise<void>;
    insertText: (value: string) => Promise<void>;
    highlightRowsWithColor: (rows: number[], color: string) => Promise<void>;
    clearHighlightRows: () => Promise<void>;
    runScript: (code: string) => void;
}