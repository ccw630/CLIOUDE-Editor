import React from 'react'
import MonacoEditor from 'react-monaco-editor'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

class Editor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: props.code || '',
      runFunc: props.handleRun,
      sendInput: props.sendInput,
      lastPos : { line: 1, column: 1 },
      undo: false,
      input: '',
      readOnly: props.readOnly || false,
      appending: false,
      isSourceEditor: props.isSourceEditor || false
    }
  }

  invalidPosition = (line, column) => (line === this.state.lastPos.line && column < this.state.lastPos.column) || line < this.state.lastPos.line

  editorDidMount = (editor, monaco) => {
    this.editor = editor
    editor.addAction({
      id: 'run',
      label: 'run',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KEY_R],
      run: this.state.runFunc
    })
    editor.onDidChangeCursorPosition(e => {
      if (this.invalidPosition(e.position.lineNumber, e.position.column)) {
        this.editor.setPosition({ lineNumber: this.state.lastPos.line, column: this.state.lastPos.column })
      }
    })
    this.editor.setValue(this.state.value)
    editor.focus()
  }

  reformat = () => this.editor.trigger('', 'editor.action.formatDocument')
  getValue = () => this.editor.getValue()
  setValue = (value) => this.editor.setValue(value)
  clear = () => this.setValue('')
  appendValue = (text) => {
    const range = new monaco.Range(
        this.state.lastPos.line,
        this.state.lastPos.column,
        this.state.lastPos.line,
        this.state.lastPos.column,
    )

    this.setState({ appending: true }, () => {
      this.editor.executeEdits('', [
        { range, text, forceMoveMarkers: true }
      ], (op) => this.setState({ lastPos: { line: op[0].range.endLineNumber, column: op[0].range.endColumn }}))
      this.editor.pushUndoStop()
    })
  }
  
  onChange = (newValue, e) => {
    if (this.state.isSourceEditor) return
    const invalid = e.changes.some(x => !this.state.appending && x.range && (this.invalidPosition(x.range.startLineNumber, x.range.startColumn) || this.state.readOnly))
    if (e.isUndoing && !this.state.appending && invalid) {
      this.setState({ appending: true }, () => this.editor.trigger('', 'redo'))
    } else if (invalid) {
      this.setState({ appending: true }, () => this.editor.trigger('', 'undo'))
    } else {
      if (!this.state.appending && e.changes.some(x => x.text === '\n')) {
        const endColumn = 1, endLineNumber = this.editor.getModel().getLineCount()
        const startColumn = this.state.lastPos.column, startLineNumber = this.state.lastPos.line
        this.state.sendInput(this.editor.getModel().getValueInRange({ endColumn, endLineNumber, startColumn, startLineNumber }))
        this.setState({ lastPos: { line: endLineNumber, column: endColumn }})
      }
      this.setState({ appending: false })
    }
  }

  render() {
    const { language } = this.props
    const options = {
      selectOnLineNumbers: true,
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: "14px",
      wordBasedSuggestions: language !== "plaintext",
      contextmenu: false,
    }
    return (
      <MonacoEditor
        language={language}
        options={options}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
      />
    )
  }
}

export default Editor;