/*
 *  Copyright 2018  SenX S.A.S.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, Element, Event, EventEmitter, Listen, Method, Prop, State, Watch} from '@stencil/core/dist';
import monaco, {MarkedString} from '@timkendrick/monaco-editor/dist/standalone';
import {Monarch} from '../../monarch';
import {WarpScript} from '../../ref';
import {globalfunctions as wsGlobals} from '../../wsGlobals';
import {Utils} from '../../lib/utils';
import {Config} from '../../lib/config';
import Hover = monaco.languages.Hover;
import IReadOnlyModel = monaco.editor.IReadOnlyModel;
import IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
import IEditorConstructionOptions = monaco.editor.IEditorConstructionOptions;
import '@giwisoft/wc-tabs';
import '@giwisoft/wc-split';
import {Logger} from '../../lib/logger';
import {JsonLib} from '../../lib/jsonLib';
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';
import ResizeObserver from 'resize-observer-polyfill';
import 'whatwg-fetch';

@Component({
  tag: 'warp-view-editor',
  styleUrls: [
    '../../../node_modules/monaco-editor/min/vs/editor/editor.main.css',
    'warp-view-editor.scss',
  ],
  shadow: false,
})
export class WarpViewEditor {

  /**
   *
   * @param {string[]} tags
   * @param {string} name
   * @returns {monaco.languages.CompletionItemKind}
   */
  private static getType(tags: string[], name: string): monaco.languages.CompletionItemKind {
    const t = tags.join(' ');
    if (t.indexOf('constant') > -1) {
      return monaco.languages.CompletionItemKind.Enum;
    } else if (t.indexOf('reducer') > -1 && name !== 'REDUCE') {
      return monaco.languages.CompletionItemKind.Interface;
    } else if (t.indexOf('mapper') > -1 && name !== 'MAP') {
      return monaco.languages.CompletionItemKind.Interface;
    } else if (t.indexOf('bucketize') > -1 && name !== 'BUCKETIZE') {
      return monaco.languages.CompletionItemKind.Interface;
    } else if (t.indexOf('filter') > -1 && name !== 'FILTER') {
      return monaco.languages.CompletionItemKind.Interface;
    } else if (t.indexOf('control') > -1) {
      return monaco.languages.CompletionItemKind.Keyword;
    } else if (t.indexOf('operators') > -1) {
      return monaco.languages.CompletionItemKind.Method;
    } else if (t.indexOf('stack') > -1) {
      return monaco.languages.CompletionItemKind.Module;
    } else {
      return monaco.languages.CompletionItemKind.Function;
    }
  }

  /**
   *
   * @param {number} elapsed
   * @returns {string}
   */
  private static formatElapsedTime(elapsed: number) {
    if (elapsed < 1000) {
      return elapsed.toFixed(3) + ' ns';
    }
    if (elapsed < 1000000) {
      return (elapsed / 1000).toFixed(3) + ' μs';
    }
    if (elapsed < 1000000000) {
      return (elapsed / 1000000).toFixed(3) + ' ms';
    }
    if (elapsed < 1000000000000) {
      return (elapsed / 1000000000).toFixed(3) + ' s ';
    }
    // Max exec time for nice output: 999.999 minutes (should be OK, timeout should happen before that).
    return (elapsed / 60000000000).toFixed(3) + ' m ';
  }

  @Element() el: HTMLStencilElement;
  @Prop() url: string = '';
  @Prop() theme: string = 'light';
  @Prop() warpscript: string;
  @Prop() showDataviz = false;
  @Prop() showExecute = true;
  @Prop() showResult = true;
  @Prop() horizontalLayout = false;
  @Prop() config: Config | string;
  @Prop() displayMessages = true;
  @Prop() widthPx: number;
  @Prop() heightLine: number;
  @Prop() heightPx: number;
  @Prop() tabbed: boolean = false;
  @Prop() debug = false;
  @Prop() imageTab = false;
  @Prop() initialSize: { w?: number, h?: number, name?: string, p?: number };

  @Event() warpViewEditorStatusEvent: EventEmitter;
  @Event() warpViewEditorErrorEvent: EventEmitter;
  @Event() warpViewEditorWarpscriptChanged: EventEmitter;
  @Event() warpViewEditorWarpscriptResult: EventEmitter;
  @Event() warpViewEditorDatavizRequested: EventEmitter;
  @Event() warpViewEditorLoaded: EventEmitter;
  @Event() warpViewEditorSize: EventEmitter;
  @Event() warpViewEditorBreakPoint: EventEmitter;


  @State() result: any[];
  @State() status: { message: string, ops: number, elapsed: number, fetched: number };
  @State() error: string;
  @State() loading = false;
  @State() selectedResultTab: number = -1;

  private abortController: AbortController;
  private abortSignal: AbortSignal;
  private LOG: Logger;
  private WARPSCRIPT_LANGUAGE = 'warpscript';
  private ed: IStandaloneCodeEditor;
  private wrapper: HTMLDivElement;
  private editor: HTMLDivElement;
  private buttons: HTMLDivElement;
  private monacoTheme = 'vs';
  private innerCode: string;
  private breakpoints = {};
  private decoration = [];
  private previousParentHeight = -1;

  private innerConfig: Config = {
    buttons: {
      class: '',
    },
    execButton: {
      class: '',
      label: 'Execute',
    },
    datavizButton: {
      class: '',
      label: 'Visualize',
    },
    hover: true,
    readOnly: false,
    messageClass: '',
    errorClass: '',
    editor: {
      quickSuggestionsDelay: 10,
      quickSuggestions: true,
      tabSize: 2,
      minLineNumber: 10,
      enableDebug: false
    },
  };
  ro: ResizeObserver;

  /**
   *
   * @param {string} newValue
   * @param {string} oldValue
   */
  @Watch('theme')
  themeHandler(newValue: string, oldValue: string) {
    this.LOG.debug(['themeHandler'], 'The new value of theme is: ', newValue, oldValue);
    if ('dark' === newValue) {
      this.monacoTheme = 'vs-dark';
    } else {
      this.monacoTheme = 'vs';
    }
    this.LOG.debug(['themeHandler'], 'The new value of theme is: ', this.monacoTheme);
    monaco.editor.setTheme(this.monacoTheme);
  }

  @Watch('warpscript')
  warpscriptHandler(newValue: string, oldValue: string) {
    this.LOG.debug(['warpscriptHandler'], 'The new value of warpscript is: ', newValue, oldValue);
    this.ed.setValue(newValue);
    this.loading = false;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   *
   */
  componentWillLoad() {
    this.LOG = new Logger(WarpViewEditor, this.debug);
    if (typeof this.config === 'string') {
      this.innerConfig = Utils.mergeDeep(this.innerConfig, JSON.parse(this.config));
    } else {
      this.innerConfig = Utils.mergeDeep(this.innerConfig, this.config);
    }
    this.LOG.debug(['componentWillLoad'], 'innerConfig: ', this.innerConfig, this.config);
    this.innerCode = this.el.textContent;
    //add blank lines when needed
    for (let i = this.innerCode.split('\n').length; i < this.innerConfig.editor.minLineNumber; i++) {
      this.innerCode += '\n';
    }
    if ('dark' === this.theme) {
      this.monacoTheme = 'vs-dark';
    }
    this.LOG.debug(['componentWillLoad'], 'componentWillLoad theme is: ', this.theme);
    if (!monaco.languages.getLanguages().find(l => l.id === this.WARPSCRIPT_LANGUAGE)) {
      monaco.languages.register({id: this.WARPSCRIPT_LANGUAGE});
      this.LOG.debug(['componentWillLoad'], 'register: ', this.WARPSCRIPT_LANGUAGE);
      monaco.languages.setMonarchTokensProvider(this.WARPSCRIPT_LANGUAGE, Monarch.rules);
      monaco.languages.setLanguageConfiguration(this.WARPSCRIPT_LANGUAGE, {
          wordPattern: /[^\s\t]+/,
          comments: {
            lineComment: '//',
            blockComment: ['/**', '*/'],
          },
          brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['<%', '%>'],
            ['<\'', '\'>'],
            ['[[', ']]'],
          ],
          autoClosingPairs: [
            {open: '{', close: '}'},
            {open: '[', close: ']'},
            {open: '(', close: ')'},
            {open: '<%', close: '%>'},
            {open: '[[', close: ']]'},
            {open: ' \'', close: '\'', notIn: ['string', 'comment']},
            {open: '<\'', close: '\'>'},
            {open: '"', close: '"', notIn: ['string']},
            {open: '`', close: '`', notIn: ['string', 'comment']},
            {open: '/**', close: ' */', notIn: ['string']},
          ],
          surroundingPairs: [
            {open: '{', close: '}'},
            {open: '[', close: ']'},
            {open: '(', close: ')'},
            {open: '[[', close: ']]'},
            {open: '<%', close: '%>'},
            {open: '<\'', close: '\'>'},
            {open: '\'', close: '\''},
            {open: '"', close: '"'},
            {open: '`', close: '`'},
          ],
          onEnterRules: [
            {
              // e.g. /** | */
              beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
              afterText: /^\s*\*\/$/,
              action: {indentAction: monaco.languages.IndentAction.IndentOutdent, appendText: ' * '},
            },
            {
              // e.g. /** ...|
              beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
              action: {indentAction: monaco.languages.IndentAction.None, appendText: ' * '},
            },
            {
              // e.g.  * ...|
              beforeText: /^(\t|( {2}))* \*( ([^*]|\*(?!\/))*)?$/,
              action: {indentAction: monaco.languages.IndentAction.None, appendText: '* '},
            },
            {
              // e.g.  */|
              beforeText: /^(\t|( {2}))* \*\/\s*$/,
              action: {indentAction: monaco.languages.IndentAction.None, removeText: 1},
            },
          ],
        },
      );
      monaco.languages.registerHoverProvider(this.WARPSCRIPT_LANGUAGE, {
        provideHover: (model: IReadOnlyModel, position: monaco.Position) => {
          const word = model.getWordAtPosition(position);
          const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
          this.LOG.debug(['componentWillLoad'], 'provideHover', model, position, word);
          const name = word.word;
          const entry = wsGlobals[name];
          if (entry && entry.description) {
            const signature = entry.signature || '';
            const contents: MarkedString[] = ['### ' + name, {
              language: this.WARPSCRIPT_LANGUAGE,
              value: signature,
            }, entry.description.replace(/(\/doc\/\w+)/g, x => `https://www.warp10.io${x}`)];
            return {
              range: range,
              contents: contents,
            } as Hover;
          }

          return undefined;
        },
      });

      monaco.languages.registerCompletionItemProvider(this.WARPSCRIPT_LANGUAGE, {
        provideCompletionItems: () => {
          const defs = [];
          WarpScript.reference.forEach(f => {
            defs.push({label: f.name, kind: WarpViewEditor.getType(f.tags, f.name)});
          });
          return defs;
        },
      });
    }
  }


  resizeWatcher() {
    const editorParentHeight = this.editor.parentElement.getBoundingClientRect().height
      - parseInt(window.getComputedStyle(this.editor.parentElement).getPropertyValue("padding-top"))
      - parseInt(window.getComputedStyle(this.editor.parentElement).getPropertyValue("padding-bottom"));

    const warpviewParentHeight = this.el.parentElement.getBoundingClientRect().height
      - parseInt(window.getComputedStyle(this.el.parentElement).getPropertyValue("padding-top"))
      - parseInt(window.getComputedStyle(this.el.parentElement).getPropertyValue("padding-bottom"));

    //fix the 5px editor height in chrome by setting the wrapper height at element level
    if (Math.abs(this.wrapper.getBoundingClientRect().height - warpviewParentHeight) > 30) {
      console.log("putain, pas bon", this.wrapper.getBoundingClientRect().height, warpviewParentHeight)
      this.LOG.debug(["resize"], "resize wrapper to parent height " + warpviewParentHeight)
      this.wrapper.style.height = warpviewParentHeight + "px";
    }
    //watch for editor parent' size change
    if (editorParentHeight != this.previousParentHeight) {
      this.previousParentHeight = editorParentHeight;
      // TODO: the 20 px offset in firefox might be a bug around flex countainers. Can't figure out.
      let editorH = Math.floor(editorParentHeight) - 20 - (this.buttons ? this.buttons.getBoundingClientRect().height : 0);
      let editorW = Math.floor(this.editor.parentElement.getBoundingClientRect().width);
      this.LOG.debug(["resize"], "resized editor to ", editorW, editorH)
      this.ed.layout({ height: editorH, width: editorW });
      this.editor.style.overflow = 'hidden';
    }
  }
  // noinspection JSUnusedGlobalSymbols
  /**
   *
   */
  componentDidLoad() {
    if (!!this.heightPx) { //if height-px is set, size is fixed.
      this.el.style.height = this.heightPx + 'px';
      this.wrapper.style.height = this.heightPx + 'px';
    } else {
      setInterval(this.resizeWatcher.bind(this),200); //compute the layout manually in a 200ms timer
    }
    try {
      this.LOG.debug(['componentDidLoad'], 'warpscript', this.warpscript);
      this.LOG.debug(['componentDidLoad'], 'inner: ', this.innerCode);
      const edOpts: IEditorConstructionOptions = {
        quickSuggestionsDelay: this.innerConfig.editor.quickSuggestionsDelay,
        quickSuggestions: this.innerConfig.editor.quickSuggestions,
        value: this.warpscript || this.innerCode,
        language: this.WARPSCRIPT_LANGUAGE,
        automaticLayout: (!!this.heightPx), //monaco auto layout is ok if parent has a fixed size, not 100% or a calc ( % px ) formula.
        theme: this.monacoTheme,
        hover: this.innerConfig.hover,
        readOnly: this.innerConfig.readOnly,
        fixedOverflowWidgets: true,
        folding: true,
        glyphMargin: this.innerConfig.editor.enableDebug,
      };
      this.LOG.debug(['componentDidLoad'], 'edOpts: ', edOpts);
      this.ed = monaco.editor.create(this.editor, edOpts);
      if (this.innerConfig.editor.enableDebug) {
        this.ed.onMouseDown(e => {
          if (e.event.leftButton) {
            if (e.target.type === 2 || e.target.type === 3 || e.target.type === 4) {
              this.toggleBreakPoint(e.target.position.lineNumber);
            }
          }
        });
      }
      this.ed.getModel().updateOptions({tabSize: this.innerConfig.editor.tabSize});
      if (this.ed) {
        this.ed.getModel().onDidChangeContent((event) => {
          this.LOG.debug(['componentDidLoad'], 'ws changed', event);
          this.warpViewEditorWarpscriptChanged.emit(this.ed.getValue());
        });
      }
      this.resize(true);
    } catch (e) {
      this.LOG.error(['WarpViewEditor'], 'componentDidLoad', e);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   *
   */
  componentDidUnload() {
    this.LOG.debug(['componentDidUnload'], 'Component removed from the DOM');
    if (this.ed) {
      this.ed.dispose();
    }
    this.ro.disconnect();
  }

  /**
   *
   */
  @Method()
  abort() {
    this.abortController.abort();
  }

  @Method()
  displayResult(result: string) {
    this.result = new JsonLib().parse(result, undefined);
  }

  /**
   *
   * @param {number} line
   */
  @Method()
  highlight(line: number) {
    const currentKey = 'hl-' + line;
    Object.keys(this.breakpoints).forEach(k => {
      if (k.startsWith('hl')) {
        delete this.breakpoints[k];
      }
    });
    this.breakpoints[currentKey] = {
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'warpviewContentClass'
      }
    };
    this.decoration = this.ed.deltaDecorations(this.decoration, Utils.toArray(this.breakpoints));
  }

  private toggleBreakPoint(line: number) {
    const currentKey = 'bp-' + line;
    if (this.breakpoints[currentKey]) {
      delete this.breakpoints[currentKey];
    } else {
      this.breakpoints[currentKey] = {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'warpviewGlyphMarginClass'
        }
      };
    }
    this.warpViewEditorBreakPoint.emit(this.breakpoints);
    this.decoration = this.ed.deltaDecorations(this.decoration, Utils.toArray(this.breakpoints));
  }

  /**
   *
   */
  @Method()
  execute() {
    this.result = undefined;
    this.status = undefined;
    this.error = undefined;
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
    if (this.ed) {
      this.LOG.debug(['execute'], 'this.ed.getValue()', this.ed.getValue());
      this.loading = true;
      //parse comments to look for inline url or preview modifiers
      let modifiers: any = Utils.readCommentsModifiers(this.ed.getValue());
      let previewType = modifiers.preview || "none";
      if (previewType == 'imag') {
        this.selectedResultTab = 2; //select image tab.
      } else if (this.selectedResultTab == 2) {
        this.selectedResultTab = 0; //on next execution, select results tab.
      }
      let executionUrl = modifiers.warp10URL || this.url;
      console.log("preview",previewType)
      fetch(executionUrl, { method: 'POST', body: this.ed.getValue(), signal: this.abortSignal }).then(response => {
        if (response.ok) {
          response.text().then(res => {
            this.LOG.debug(['execute'], 'response', res);
            this.warpViewEditorWarpscriptResult.emit(res);
            this.status = {
              message: `Your script execution took
 ${WarpViewEditor.formatElapsedTime(parseInt(response.headers.get('x-warp10-elapsed'), 10))}
 serverside, fetched
 ${response.headers.get('x-warp10-fetched')} datapoints and performed
 ${response.headers.get('x-warp10-ops')}  WarpScript operations.`,
              ops: parseInt(response.headers.get('x-warp10-ops')),
              elapsed: parseInt(response.headers.get('x-warp10-elapsed')),
              fetched: parseInt(response.headers.get('x-warp10-fetched'))
            };
            this.warpViewEditorStatusEvent.emit(this.status);

            try {
              const parsed = new JsonLib().parse(res, undefined);
              this.result = [...parsed];
            } catch (e) {
              if (e.name && e.message && e.at && e.text) {
                this.error = `${e.name}: ${e.message} at char ${e.at} => ${e.text}`;
              } else {
                this.error = e.toString();
              }
              this.result = [res];
              this.LOG.error(['execute 1'], this.error);
              this.warpViewEditorErrorEvent.emit(this.error);
            }
            this.loading = false;
          }, err => {
            this.error = err;
            this.warpViewEditorErrorEvent.emit(this.error);
            this.loading = false;
            this.LOG.error(['execute 2'], err);
          });
        } else {
          this.error = response.statusText;
          this.warpViewEditorErrorEvent.emit(this.error);
          this.loading = false;
          this.LOG.error(['execute 3'], response.statusText);
        }
      }, err => {
        if (err.name === 'AbortError') {
          this.error = 'Aborted';
          this.warpViewEditorErrorEvent.emit(this.error);
          this.LOG.debug(['execute 4'], 'aborted');
        } else {
          if (err.name === 'TypeError') {
            this.error = 'Unable to reach ' + executionUrl;
          } else {
            this.error = err.message || 'Unable to reach ' + executionUrl;
          }
          this.LOG.error(['execute 5'], {e: err});
        }
        this.warpViewEditorErrorEvent.emit(this.error);
        this.loading = false;
        this.result = undefined;
        this.status = undefined;
      });
    } else {
      this.loading = false;
      this.LOG.error(['execute'], 'no active editor');
    }
  }

  /**
   *
   */
  requestDataviz() {
    this.warpViewEditorDatavizRequested.emit(this.result);
  }

  /**
   *
   * @param event
   */
  @Listen('document:resize')
  @Listen('resized')
  onResized(event) {
    this.LOG.debug(['onResized'], event.detail.editor);
    this.warpViewEditorSize.emit(event.detail.editor);
  }

  /**
   *
   * @param {boolean} initial
   */
  @Method()
  resize(initial: boolean) {
    window.setTimeout(() => {
      if (initial && (!!this.heightPx)) {
        this.editor.style.height = `calc(100% - ${this.buttons ? this.buttons.getBoundingClientRect().height : 100}px )`;
      }
      if (initial) {
        this.warpViewEditorLoaded.emit();
      }
    }, initial ? 500 : 100);
  }

  render() {
    // @ts-ignore
    // noinspection JSXNamespaceValidation
    const loading = !!this.loading ?
      <div class='loader'>
        <div class='spinner'/>
      </div>
      : '';
    const datavizBtn = this.showDataviz && this.result ?
      <button type='button' class={this.innerConfig.datavizButton.class}
              onClick={() => this.requestDataviz()} innerHTML={this.innerConfig.datavizButton.label}>
      </button>
      : '';
    const execBtn = this.showExecute ?
      <button type='button' class={this.innerConfig.execButton.class}
              onClick={() => this.execute()} innerHTML={this.innerConfig.execButton.label}>
      </button>
      : '';

    // noinspection ThisExpressionReferencesGlobalObjectJS
    const message =
      this.status && this.displayMessages ?
        <div class={this.innerConfig.messageClass}>{this.status.message}</div>
        : '';

    // noinspection ThisExpressionReferencesGlobalObjectJS
    const error = this.error && this.displayMessages ?
      <div class={this.innerConfig.errorClass}>{this.error}</div> : '';

    const responsiveStyle = { height: 'calc( 100% - 22px )', width: '100%', overflow:'hidden' }

    // noinspection ThisExpressionReferencesGlobalObjectJS
    return <div class={'wrapper-main ' + this.theme} ref={(el) => this.wrapper = el as HTMLDivElement}>
      <wc-split items={this.getItems()}>
        <div slot="editor" class="editor-wrapper">
          <div class='warpscript'>
            <slot/>
          </div>
          <div ref={(el) => this.editor = el as HTMLDivElement}/>
          {loading}
          <div class={'warpview-buttons ' + this.innerConfig.buttons.class}
               ref={(el) => this.buttons = el as HTMLDivElement}>
            {datavizBtn}
            {execBtn}
            {this.error || this.result ? <div class='messages'>{message} {error}</div> : {loading}}
          </div>
        </div>
        {this.showResult ? <div slot="result">
          <wc-tabs class='wctabs' selection={this.selectedResultTab}>
            <wc-tabs-header slot='header' name='tab1'>Results</wc-tabs-header>
            <wc-tabs-header slot='header' name='tab2'>Raw JSON</wc-tabs-header>
            
            {this.imageTab ? <wc-tabs-header slot='header' name='tab3'>Images</wc-tabs-header> : ''}

            <wc-tabs-content slot='content' name='tab1'>
              <div class="tab-wrapper">
                <warp-view-result theme={this.theme} result={this.result} config={this.innerConfig}/>
              </div>
            </wc-tabs-content>

            <wc-tabs-content slot='content' name='tab2' responsive='true' >
              <div class="tab-wrapper" style={responsiveStyle} >
                <warp-view-raw-result theme={this.theme} result={this.result} config={this.innerConfig}/>
              </div>
            </wc-tabs-content>

            {this.imageTab ? 
            <wc-tabs-content slot='content' name='tab3'>
              <div class="tab-wrapper">
                <warp-view-image-result theme={this.theme} result={this.result} config={this.innerConfig} />
              </div>
            </wc-tabs-content> : '' }

          </wc-tabs>
        </div> : ''}
      </wc-split>

    </div>;
  }

  private getItems() {
    const headers = [];
    if (this.showResult) {
      headers.push({name: 'editor', size: this.initialSize ? this.initialSize.p || 50 : 50});
      headers.push({name: 'result', size: this.initialSize ? 100 - this.initialSize.p || 50 : 50});
    } else {
      headers.push({name: 'editor', size: 100});
    }
    return headers;
  }
}
