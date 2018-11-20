import '../../stencil.core';
import '../../stencil.core';
import '../../stencil.core';
import '../../stencil.core';
export declare class WarpViewResult {
    el: HTMLStencilElement;
    result: {
        json: any[];
        error: string;
        message: string;
    };
    theme: string;
    config: object;
    displayMessages: boolean;
    loading: boolean;
    private _result;
    private _config;
    private resEd;
    private monacoTheme;
    private resUid;
    themeHandler(newValue: string, _oldValue: string): void;
    resultHandler(newValue: any, _oldValue: any): void;
    /**
     *
     */
    componentWillLoad(): void;
    buildEditor(json: string): void;
    componentDidLoad(): void;
    render(): JSX.Element;
}