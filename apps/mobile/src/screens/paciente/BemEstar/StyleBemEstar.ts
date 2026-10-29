import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  screenScroll: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 42,
    height: 42,
  },

  screenContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 120,
  },

  tipCard: {
    minHeight: 124,
    padding: 20,
    borderRadius: 22,
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 4,
  },

  tipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  tipIcon: {
    width: 44,
    height: 44,
    marginRight: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  tipTitle: {
    marginBottom: 7,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },

  tipDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    opacity: 0.94,
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },

  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  exerciseCard: {
    width: '48.3%',
    minHeight: 172,
    padding: 15,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },

  exerciseIcon: {
    width: 47,
    height: 47,
    marginBottom: 13,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exerciseCardContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  exerciseCardTitle: {
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  exerciseCardDescription: {
    fontSize: 12.5,
    lineHeight: 18,
  },

  guidedList: {
    gap: 11,
  },

  guidedCard: {
    width: '100%',
    minHeight: 96,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },

  guidedIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guidedInformation: {
    flex: 1,
    minWidth: 0,
  },

  guidedTitle: {
    marginBottom: 4,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },

  guidedDescription: {
    fontSize: 12.5,
    lineHeight: 17,
  },

  durationBadge: {
    minWidth: 44,
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  durationText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  supportCard: {
    marginTop: 20,
    padding: 15,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  supportText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 22,
    backgroundColor: 'rgba(20, 18, 31, 0.66)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guidedModal: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '95%',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  guidedModalHeader: {
    minHeight: 91,
    paddingHorizontal: 17,
    paddingTop: 15,
    paddingBottom: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  modalHeaderSpacer: {
    width: 38,
    height: 38,
  },

  modalHeaderText: {
    flex: 1,
    paddingHorizontal: 6,
    alignItems: 'center',
  },

  guidedModalTitle: {
    textAlign: 'center',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },

  guidedModalSubtitle: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 19,
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guidedModalScroll: {
    flexShrink: 1,
  },

  guidedModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },

  breathingStage: {
    width: '100%',
    height: 184,
    marginTop: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  breathingOuterCircle: {
    width: 142,
    height: 142,
    borderRadius: 71,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.84,
  },

  breathingInnerCircle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: 'center',
    justifyContent: 'center',
  },

  breathingPhaseTitle: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },

  breathingPhaseDescription: {
    minHeight: 21,
    maxWidth: 310,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 20,
  },

  guidanceCard: {
    width: '100%',
    minHeight: 165,
    marginVertical: 12,
    padding: 22,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guidanceIcon: {
    width: 54,
    height: 54,
    marginBottom: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guidanceText: {
    maxWidth: 310,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },

  timerCard: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 17,
    alignItems: 'center',
  },

  timerText: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },

  timerDescription: {
    maxWidth: 285,
    marginTop: 3,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },

  stepsContainer: {
    width: '100%',
    marginTop: 14,
    padding: 14,
    borderRadius: 17,
    gap: 11,
  },

  stepRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  stepNumber: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },

  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  guidedModalActions: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
  },

  primaryAction: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },

  secondaryAction: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },

  finishAction: {
    minHeight: 43,
    marginHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  finishActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  techniqueModal: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '95%',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  techniqueScroll: {
    flexShrink: 1,
  },

  techniqueContent: {
    paddingHorizontal: 20,
    paddingTop: 3,
    paddingBottom: 20,
  },

  techniqueIntroduction: {
    marginBottom: 17,
    fontSize: 14,
    lineHeight: 21,
  },

  techniqueList: {
    gap: 10,
  },

  techniqueStep: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  techniqueNumber: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  techniqueNumberText: {
    fontSize: 18,
    fontWeight: '700',
  },

  techniqueStepInformation: {
    flex: 1,
    minWidth: 0,
  },

  techniqueStepTitle: {
    marginBottom: 3,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },

  techniqueStepDescription: {
    fontSize: 12,
    lineHeight: 17,
  },

  encouragementCard: {
    marginTop: 17,
    padding: 16,
    borderRadius: 17,
    alignItems: 'center',
  },

  encouragementEmoji: {
    marginBottom: 6,
    fontSize: 24,
  },

  encouragementText: {
    maxWidth: 300,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  techniqueActions: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },

  moodOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20, 18, 31, 0.66)',
  },

  moodSheet: {
    width: '100%',
    maxHeight: '90%',
    paddingHorizontal: 18,
    paddingTop: 11,
    paddingBottom: 18,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    alignItems: 'center',
  },

  moodHandle: {
    width: 44,
    height: 5,
    marginBottom: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.35)',
  },

  moodCloseButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 2,
    padding: 7,
  },

  successIcon: {
    width: 64,
    height: 64,
    marginTop: 11,
    marginBottom: 13,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moodTitle: {
    paddingHorizontal: 34,
    textAlign: 'center',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
  },

  moodSubtitle: {
    maxWidth: 320,
    marginTop: 6,
    marginBottom: 18,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 19,
  },

  moodOptions: {
    width: '100%',
    marginBottom: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  moodOption: {
    width: '19%',
    minHeight: 80,
    paddingHorizontal: 2,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moodEmoji: {
    marginBottom: 6,
    fontSize: 24,
  },

  moodOptionText: {
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
  },

  privacyCard: {
    width: '100%',
    marginBottom: 14,
    padding: 13,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  privacyText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '500',
  },

  notNowButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notNowText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});