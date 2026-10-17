import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import RenderHTML, { TNodeChildrenRenderer, useContentWidth, type CustomBlockRenderer, type DomVisitorCallbacks, type TNode } from '@native-html/render';
import { apiBase, mediaUrl } from '../../services/api';
import { colors, fontFamily, radius, spacing } from '../../ui/theme';

function tableRows(node: TNode): TNode[] {
  return node.children.flatMap(child => child.tagName === 'tr' ? [child] : child.tagName === 'thead' || child.tagName === 'tbody' || child.tagName === 'tfoot' ? tableRows(child) : []);
}

const NativeTable: CustomBlockRenderer = ({ tnode }) => {
  const contentWidth = useContentWidth();
  const rows = tableRows(tnode);
  const caption = tnode.children.find(child => child.tagName === 'caption');
  const columns = Math.max(1, ...rows.map(row => row.children.reduce((count, cell) => count + Math.max(1, Number(cell.attributes.colspan) || 1), 0)));
  const cellWidth = Math.max(140, contentWidth / Math.min(columns, 2));
  return <View style={styles.tableSection}>
    {caption && <View style={styles.caption}><TNodeChildrenRenderer tnode={caption}/></View>}
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
      <View style={styles.table}>{rows.map((row, rowIndex) => <View key={rowIndex} style={styles.row}>{row.children.filter(cell => cell.tagName === 'td' || cell.tagName === 'th').map((cell, cellIndex) => <View key={cellIndex} style={[styles.cell, { width: cellWidth * Math.max(1, Number(cell.attributes.colspan) || 1) }, cell.tagName === 'th' && styles.headingCell]}><TNodeChildrenRenderer tnode={cell}/></View>)}</View>)}</View>
    </ScrollView>
  </View>;
};

const renderers = { table: NativeTable };
const domVisitors: DomVisitorCallbacks = { onElement(element) { if (element.name === 'img' && element.attribs.src) element.attribs.src = mediaUrl(element.attribs.src); } };
const tagsStyles = {
  body: { color: '#756C7B', fontFamily, fontSize: 12, lineHeight: 22 },
  p: { marginTop: 0, marginBottom: spacing.md },
  h1: { fontSize: 20, lineHeight: 27, marginTop: spacing.xl, marginBottom: spacing.md },
  h2: { fontSize: 18, lineHeight: 25, marginTop: spacing.xl, marginBottom: spacing.md },
  h3: { fontSize: 16, lineHeight: 23, marginTop: spacing.lg, marginBottom: spacing.sm },
  a: { color: colors.primary },
  img: { marginVertical: spacing.sm, borderRadius: radius.small },
};

export function RichProductDescription({ html, width }: { html: string; width: number }) {
  const source = useMemo(() => ({ html, baseUrl: `${apiBase}/` }), [html]);
  return <RenderHTML source={source} contentWidth={width} baseStyle={tagsStyles.body} tagsStyles={tagsStyles} renderers={renderers} domVisitors={domVisitors} enableExperimentalMarginCollapsing defaultTextProps={{ selectable: true }}/>;
}

const styles = StyleSheet.create({
  tableSection: { marginVertical: spacing.md },
  caption: { paddingBottom: spacing.sm },
  tableScroll: { paddingBottom: spacing.sm },
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  cell: { padding: spacing.md, borderBottomWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  headingCell: { backgroundColor: colors.surface },
});
